# Operating the JobHunt deployment

Cluster: self-managed kubeadm (1 control-plane `35.173.109.185` + 2 workers).
App namespace: **`jobhunt`**. Live at **https://jobhunt.plutusai.info**.
Manifests: `deploy/k8s/` (edit YAML → `kubectl apply -k` — treat git as the source of truth).

---

## 1. Access

```bash
# one-off
export KUBECONFIG=~/.kube/voxtrace-aws-config
kubectl get nodes

# or merge it into your default config so `kubectl` just works
KUBECONFIG=~/.kube/config:~/.kube/voxtrace-aws-config kubectl config view --flatten > /tmp/merged
mv /tmp/merged ~/.kube/config
kubectl config use-context kubernetes-admin@kubernetes

# handy: default every command to the app namespace
kubectl config set-context --current --namespace=jobhunt
```

Optional TUI: `brew install k9s && k9s -n jobhunt`.

SSH to nodes (rarely needed): `ssh -i ~/Downloads/voxtrace.pem ubuntu@35.173.109.185`
(workers: `98.92.2.55`, `34.235.121.210`).

---

## 2. Daily inspection

```bash
kubectl get pods,deploy,statefulset,ingress,pvc,cronjob        # what's up
kubectl get events --sort-by=.lastTimestamp | tail -20         # what just happened
kubectl top pods ; kubectl top nodes                           # resource use

kubectl logs deploy/jobhunt-app -c app -f                      # app logs (follow)
kubectl logs deploy/jobhunt-app -c migrate                     # last migration run
kubectl logs -l app=jobhunt-app --previous                     # crashed container's logs

kubectl describe pod -l app=jobhunt-app                        # scheduling / probe / pull errors
kubectl exec -it deploy/jobhunt-app -c app -- sh              # shell inside the pod
```

Health from outside: `curl https://jobhunt.plutusai.info/api/health`

---

## 3. Deploy a new version

Build for **linux/amd64** (the nodes are amd64) and push to GHCR, then roll:

```bash
TAG=$(git rev-parse --short HEAD)
docker buildx build --platform linux/amd64 --builder jh --push \
  -t ghcr.io/ghaznfar/job-hunt:$TAG -t ghcr.io/ghaznfar/job-hunt:latest .

kubectl -n jobhunt set image deploy/jobhunt-app \
  app=ghcr.io/ghaznfar/job-hunt:$TAG \
  migrate=ghcr.io/ghaznfar/job-hunt:$TAG
kubectl -n jobhunt rollout status deploy/jobhunt-app
```

The `migrate` initContainer runs `prisma migrate deploy` before the new pod
serves traffic. Strategy is `Recreate` (the RWO uploads volume can't attach to
two pods) — expect a few seconds of downtime per release.

**Rollback:**
```bash
kubectl -n jobhunt rollout undo deploy/jobhunt-app
kubectl -n jobhunt rollout history deploy/jobhunt-app
```

**Full re-apply from manifests** (after editing anything under `deploy/k8s/`):
```bash
kubectl apply -k deploy/k8s/overlays/voxtrace
```

---

## 4. Change config or secrets

**Non-secret** (`deploy/k8s/base/configmap.yaml`) — e.g. flip AI to real:
```bash
# edit AI_PROVIDER: "anthropic" in the file, then:
kubectl apply -k deploy/k8s/overlays/voxtrace
kubectl -n jobhunt rollout restart deploy/jobhunt-app   # pods re-read env on restart
```

**Secrets** (`deploy/k8s/overlays/voxtrace/secret.env`, gitignored) — e.g. add the key:
```bash
# ANTHROPIC_API_KEY=sk-ant-...   (also STRIPE_*, RESEND_API_KEY, ADZUNA_*, GOOGLE_*)
kubectl apply -k deploy/k8s/overlays/voxtrace
kubectl -n jobhunt rollout restart deploy/jobhunt-app
```

Quick one-off without editing files:
```bash
kubectl -n jobhunt patch secret jobhunt-secret --type merge \
  -p "{\"stringData\":{\"ANTHROPIC_API_KEY\":\"sk-ant-...\"}}"
kubectl -n jobhunt rollout restart deploy/jobhunt-app
```

Inspect a secret value:
```bash
kubectl -n jobhunt get secret jobhunt-secret -o jsonpath='{.data.AUTH_SECRET}' | base64 -d; echo
```

---

## 5. Database

```bash
# psql shell
kubectl -n jobhunt exec -it postgres-0 -- psql -U jobhunt -d jobhunt

# ad-hoc query
kubectl -n jobhunt exec postgres-0 -- psql -U jobhunt -d jobhunt -c \
  'select count(*) from "Job"; select email,role from "User";'

# backup (do this on a schedule — there is no HA/PITR)
kubectl -n jobhunt exec postgres-0 -- \
  sh -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_dump -U jobhunt -Fc jobhunt' > jobhunt-$(date +%F).dump

# restore into a fresh DB
kubectl -n jobhunt exec -i postgres-0 -- \
  sh -c 'PGPASSWORD=$POSTGRES_PASSWORD pg_restore -U jobhunt -d jobhunt --clean --if-exists' < jobhunt-YYYY-MM-DD.dump

# migrations run automatically on deploy; to run by hand:
kubectl -n jobhunt exec deploy/jobhunt-app -c app -- node_modules/.bin/prisma migrate status
```

Re-seed the skill catalogue + demo data (needs the image that includes `src/`):
```bash
sed 's#ghcr.io/OWNER/ai-hunting-job-saas-mvp:latest#ghcr.io/ghaznfar/job-hunt:latest#' \
  deploy/k8s/base/seed-job.yaml | kubectl -n jobhunt apply -f -
kubectl -n jobhunt logs -f job/jobhunt-seed
kubectl -n jobhunt delete job jobhunt-seed
```

---

## 6. Job ingestion

```bash
# scheduled every 6h by CronJob/jobhunt-ingest
kubectl -n jobhunt get cronjob
kubectl -n jobhunt get jobs -l job-name                      # recent runs

# trigger now
kubectl -n jobhunt create job --from=cronjob/jobhunt-ingest ingest-manual-$(date +%s)

# or hit the endpoint directly
POD=$(kubectl -n jobhunt get pod -l app=jobhunt-app -o jsonpath='{.items[0].metadata.name}')
CRON=$(kubectl -n jobhunt get secret jobhunt-secret -o jsonpath='{.data.CRON_SECRET}' | base64 -d)
kubectl -n jobhunt exec $POD -c app -- \
  node -e "fetch('http://localhost:3000/api/cron/ingest-jobs?key=$CRON').then(r=>r.text()).then(console.log)"
```

To enable the live Adzuna feed: put `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` in the
secret and set `JOB_PROVIDERS: "mock,adzuna"` in the ConfigMap, then restart.

---

## 7. TLS / Ingress

```bash
kubectl -n jobhunt get certificate                           # jobhunt-tls should be READY=True
kubectl -n jobhunt describe certificate jobhunt-tls          # renewal status (cert-manager auto-renews ~30d before expiry)
kubectl get clusterissuer letsencrypt-prod

kubectl -n ingress-nginx get pods                            # the controller (hostNetwork on the control-plane)
kubectl -n ingress-nginx logs deploy/ingress-nginx-controller -f

# force a cert re-issue if it ever gets stuck
kubectl -n jobhunt delete certificate jobhunt-tls && kubectl apply -k deploy/k8s/overlays/voxtrace
```

Changing the hostname: edit `base/ingress.yaml` + `base/configmap.yaml`
(`APP_URL`/`AUTH_URL`) + point DNS at `35.173.109.185`, then `kubectl apply -k …`
and `rollout restart`.

---

## 8. Cluster infra (installed once, rarely touched)

| Component | Namespace | Notes |
| --- | --- | --- |
| ingress-nginx | `ingress-nginx` | hostNetwork on the control-plane node; it *is* the public entrypoint |
| cert-manager | `cert-manager` | issues/renews `jobhunt-tls` |
| metrics-server | `kube-system` | powers `kubectl top` |
| flannel | `kube-flannel` | pod networking — don't touch |
| local-path | `local-path-storage` | the default StorageClass backing every PVC (node-local) |

Upgrade an addon: re-`kubectl apply -f <newer upstream URL>` (same commands as the
install in `README.md`). Nothing app-specific lives in these.

---

## 9. Nodes (10 GiB disks — the tight spot)

```bash
for ip in 35.173.109.185 98.92.2.55 34.235.121.210; do
  ssh -i ~/Downloads/voxtrace.pem ubuntu@$ip 'hostname; df -h / | tail -1'
done

# reclaim space on a node
ssh -i ~/Downloads/voxtrace.pem ubuntu@<ip> \
  'sudo crictl rmi --prune; sudo journalctl --vacuum-size=100M; sudo apt-get clean'
```

If a node fills up, pods there get evicted (`DiskPressure`). Watch
`kubectl get events | grep -i evict`. The lasting fix is bigger EBS volumes.

---

## 10. Troubleshooting quick map

| Symptom | Check |
| --- | --- |
| Pod `ImagePullBackOff` | `kubectl -n jobhunt get secret ghcr` exists; SA has it: `kubectl -n jobhunt get sa default -o yaml`. Re-create: see `README.md`. |
| Pod `CreateContainerConfigError` | `kubectl describe pod` — usually a securityContext/env mismatch. |
| Pod `CrashLoopBackOff` | `kubectl logs <pod> -c app --previous`. If DB-related, check `postgres-0` is Running and `DATABASE_URL` in the secret. |
| 502/503 from the URL | app pod not Ready (`kubectl get pod`), or ingress controller down (`kubectl -n ingress-nginx get pod`). |
| Cert not issued | `kubectl -n jobhunt describe certificate jobhunt-tls` and `describe challenge` — usually DNS or port 80 blocked. |
| `kubectl top` errors | metrics-server pod in `kube-system`. |
| Migrations failed on deploy | `kubectl -n jobhunt logs job/<pod> -c migrate`; fix schema, redeploy. The initContainer blocks the rollout — old pod keeps serving. |

---

## 11. Pause / resume / tear down

```bash
# scale the app to zero (stops serving; DB + data stay)
kubectl -n jobhunt scale deploy/jobhunt-app --replicas=0
kubectl -n jobhunt scale deploy/jobhunt-app --replicas=1

# remove the app but KEEP data (PVCs are not deleted by -k delete of the Deployment)
kubectl delete -k deploy/k8s/overlays/voxtrace

# nuke everything including data
kubectl delete namespace jobhunt

# also revert the cluster addons + SG rule if you're fully done
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.12.1/deploy/static/provider/baremetal/deploy.yaml
kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.16.3/cert-manager.yaml
aws ec2 revoke-security-group-ingress --group-id sg-0ab989e1b1c8d101b --protocol tcp --port 80  --cidr 0.0.0.0/0
aws ec2 revoke-security-group-ingress --group-id sg-0ab989e1b1c8d101b --protocol tcp --port 443 --cidr 0.0.0.0/0
```
