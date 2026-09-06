# Kubernetes deployment (self-managed cluster: 1 control-plane + 2 workers)

## What this deploys (namespace `jobhunt`)

| Object | Purpose |
| --- | --- |
| `Deployment jobhunt-app` (2 replicas, anti-affinity, PDB, HPA) | The Next.js standalone server. An **initContainer runs `prisma migrate deploy`** before each rollout. |
| `StatefulSet postgres` (1 replica, 10Gi PVC) | Database. Fine for MVP; see *Production hardening* below. |
| `Deployment minio` + bucket Job | S3-compatible private storage for CV uploads (the app already speaks S3). |
| `Ingress` x2 | `jobhunt.plutusai.info` → app, `minio.plutusai.info` → MinIO (needed so browser-facing presigned URLs resolve). |
| `CronJob jobhunt-ingest` | Hits `/api/cron/ingest-jobs` every 6h. |
| `CronJob jobhunt-pg-backup` | Nightly `pg_dump` → MinIO `s3://jobhunt-cv/backups/`. |
| `Job jobhunt-seed` (manual) | One-time: skill catalogue + job sources + demo jobs. |

## Cluster prerequisites

Install these on the cluster first (once):

1. **A default StorageClass** — k3s ships `local-path`; otherwise install Longhorn / OpenEBS / Rook-Ceph. (Local-path pins Postgres to one node; that's acceptable for a single instance.)
2. **ingress-nginx** controller. On bare metal, expose it with **MetalLB** (give it a spare LAN IP range) or run it with `hostNetwork: true` on the workers behind your own HAProxy.
3. **cert-manager** + a `ClusterIssuer` named `letsencrypt-prod`:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
   cat <<'EOF' | kubectl apply -f -
   apiVersion: cert-manager.io/v1
   kind: ClusterIssuer
   metadata: { name: letsencrypt-prod }
   spec:
     acme:
       server: https://acme-v02.api.letsencrypt.org/directory
       email: you@plutusai.info
       privateKeySecretRef: { name: letsencrypt-prod }
       solvers: [{ http01: { ingress: { class: nginx } } }]
   EOF
   ```
4. **metrics-server** (only if you keep the HPA).
5. **DNS**: `A` records for `jobhunt.plutusai.info` and `minio.plutusai.info` → your ingress controller's external IP.

## Build & push the image

CI already builds it (`.github/workflows/ci.yml` / `deploy.yml`). Or locally:

```bash
docker build -t ghcr.io/plutus/ai-hunting-job-saas-mvp:$(git rev-parse --short HEAD) .
docker push ghcr.io/plutus/ai-hunting-job-saas-mvp:$(git rev-parse --short HEAD)
```

If the GHCR package is private, give the cluster a pull secret and add `imagePullSecrets` to `app.yaml`:

```bash
kubectl -n jobhunt create secret docker-registry ghcr \
  --docker-server=ghcr.io --docker-username=plutus --docker-password=$GHCR_PAT
```

## Deploy

```bash
cd deploy/k8s
cp secret.example.yaml secret.yaml     # then fill in every CHANGE_ME (gitignored)
#   AUTH_SECRET       = openssl rand -base64 32
#   CRON_SECRET       = openssl rand -hex 24
#   POSTGRES_PASSWORD = openssl rand -hex 24   (also paste into DATABASE_URL/DIRECT_URL)
#   S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY = openssl rand -hex 20  (MinIO root creds)

# point the image at your tag
kustomize edit set image ghcr.io/OWNER/ai-hunting-job-saas-mvp=ghcr.io/plutus/ai-hunting-job-saas-mvp:<tag>

kubectl apply -k .

# wait for Postgres + MinIO, then load the catalogue once:
kubectl -n jobhunt rollout status statefulset/postgres
kubectl -n jobhunt apply -f seed-job.yaml
kubectl -n jobhunt logs -f job/jobhunt-seed

kubectl -n jobhunt rollout status deploy/jobhunt-app
```

Visit `https://jobhunt.plutusai.info`. Seeded logins: `admin@jobhunt.test` / `demo@jobhunt.test`, password `password123`.

## Releasing a new version

```bash
kubectl -n jobhunt set image deploy/jobhunt-app \
  app=ghcr.io/plutus/ai-hunting-job-saas-mvp:<newtag> \
  migrate=ghcr.io/plutus/ai-hunting-job-saas-mvp:<newtag>
kubectl -n jobhunt rollout status deploy/jobhunt-app
# rollback: kubectl -n jobhunt rollout undo deploy/jobhunt-app
```

The initContainer applies any new migrations before the new pods take traffic; `maxUnavailable: 0` keeps the old pods serving until the new ones are ready.

## Enable real providers

Edit `configmap.yaml` (`AI_PROVIDER`, `JOB_PROVIDERS`, `EMAIL_DRIVER`) and put the keys in `secret.yaml`, then `kubectl apply -k .` and `kubectl -n jobhunt rollout restart deploy/jobhunt-app`. **Stripe webhook** → `https://jobhunt.plutusai.info/api/stripe/webhook`.

## Production hardening (do before real users)

- **Postgres**: this single StatefulSet has no replication or PITR. Move to the **CloudNativePG** operator (in-cluster HA + WAL backups to MinIO) or an external managed DB, and update `DATABASE_URL`. Keep `cronjob-backup.yaml` regardless.
- **Object storage**: single-node MinIO = single point of data loss for CVs. Use distributed MinIO (4 drives) or an external bucket (Cloudflare R2 / AWS S3) — just change `S3_ENDPOINT` + keys, no code change.
- **Secrets**: replace the plain `Secret` with sealed-secrets, SOPS, or external-secrets.
- **NetworkPolicy**: default-deny in `jobhunt`, then allow app→postgres:5432, app→minio:9000, ingress→app:3000.
- **Resource tuning**: watch `kubectl top pods`; the app idles ~150–250 Mi, peaks during AI calls.
- **Registry**: don't depend on GHCR uptime for scaling events — consider a small in-cluster registry or Harbor.
