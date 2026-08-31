#!/usr/bin/env bash
# One-time setup for a fresh Amazon Linux 2023 EC2 instance (t3.micro, free tier).
# Run as ec2-user:  bash provision-ec2.sh
set -euo pipefail

echo ">> Swap (1 GB RAM box — gives Docker/Caddy headroom)"
if [ ! -f /swapfile ]; then
  sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo ">> Docker + compose plugin"
sudo dnf -y install docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
DOCKER_CONFIG=/usr/libexec/docker
sudo mkdir -p $DOCKER_CONFIG/cli-plugins
sudo curl -fsSL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o $DOCKER_CONFIG/cli-plugins/docker-compose
sudo chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

echo ">> App directory"
mkdir -p ~/jobhunt
echo "Place docker-compose.prod.yml, Caddyfile and .env.prod in ~/jobhunt"

echo ">> Cron: trigger job ingestion every 6 hours"
CRON_LINE='0 */6 * * * source ~/jobhunt/.env.prod 2>/dev/null; curl -fsS "http://localhost:3000/api/cron/ingest-jobs?key=${CRON_SECRET}" >/dev/null 2>&1'
( crontab -l 2>/dev/null | grep -v ingest-jobs; echo "$CRON_LINE" ) | crontab -

echo
echo ">> Done. Log out/in once for the docker group, then:"
echo "   cd ~/jobhunt && cp .env.prod.example .env.prod && \$EDITOR .env.prod"
echo "   bash deploy.sh"
