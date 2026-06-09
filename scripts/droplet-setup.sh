#!/usr/bin/env bash
# One-time DigitalOcean droplet bootstrap (Ubuntu 22.04/24.04).
# Installs Docker + compose, adds swap (so image builds don't OOM on small
# droplets), and opens the firewall. Run as root:
#   ssh root@<DROPLET_IP> 'bash -s' < scripts/droplet-setup.sh
# or copy it over and `sudo bash scripts/droplet-setup.sh`.
set -euo pipefail

echo "==> apt update + prerequisites"
apt-get update -y
apt-get install -y ca-certificates curl git ufw

echo "==> Installing Docker Engine + compose plugin"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

echo "==> Ensuring 4G swap (a 1 GB droplet needs it to run 'next build')"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 >/dev/null 2>&1 || true
fi

echo "==> Firewall: allow SSH + HTTP + HTTPS"
ufw allow OpenSSH 2>/dev/null || ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Done. $(docker --version); compose: $(docker compose version --short)"
echo "Next: clone the repo, create .env.production, then run scripts/deploy.sh"
