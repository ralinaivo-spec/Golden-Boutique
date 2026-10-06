#!/bin/bash
# Golden Boutique — démarre le serveur sur ce Mac et affiche le lien pour les téléphones.
# Double-cliquez sur ce fichier. Laissez la fenêtre ouverte tant que la boutique travaille.

PB_VERSION="0.40.4"
PORT=8090
cd "$(dirname "$0")" || exit 1
DIR="$(pwd)"

echo ""
echo "  ========================================"
echo "     GOLDEN BOUTIQUE — serveur"
echo "  ========================================"
echo ""

# Enlève le blocage « téléchargé depuis Internet » sur les fichiers du dossier.
xattr -dr com.apple.quarantine "$DIR" 2>/dev/null

# 1. Programme PocketBase (téléchargé automatiquement la première fois)
if [ ! -x "$DIR/pocketbase" ]; then
  case "$(uname -m)" in
    arm64) ARCH="darwin_arm64" ;;
    *)     ARCH="darwin_amd64" ;;
  esac
  echo "  Première utilisation : téléchargement du serveur (environ 12 Mo)..."
  URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${ARCH}.zip"
  if ! curl -fL --progress-bar -o "$DIR/pb.zip" "$URL"; then
    echo ""
    echo "  ERREUR : téléchargement impossible. Vérifiez la connexion Internet du Mac,"
    echo "  puis relancez Demarrer-Boutique."
    read -n 1 -s -r -p "  Appuyez sur une touche pour fermer..."
    exit 1
  fi
  unzip -o -q "$DIR/pb.zip" pocketbase -d "$DIR" && rm -f "$DIR/pb.zip"
  chmod +x "$DIR/pocketbase"
  xattr -d com.apple.quarantine "$DIR/pocketbase" 2>/dev/null
  echo "  Serveur installé."
fi

# Copie le logiciel dans pb_public à chaque démarrage : celui posé à côté de ce fichier,
# sinon celui du dossier parent (dépôt GitHub téléchargé en entier). Mettre à jour = remplacer index.html.
mkdir -p "$DIR/pb_public"
if [ -f "$DIR/index.html" ]; then
  cp "$DIR/index.html" "$DIR/pb_public/index.html"
elif [ -f "$DIR/../index.html" ]; then
  cp "$DIR/../index.html" "$DIR/pb_public/index.html"
fi
if [ ! -f "$DIR/pb_public/index.html" ]; then
  echo "  ERREUR : le fichier pb_public/index.html est introuvable dans ce dossier."
  read -n 1 -s -r -p "  Appuyez sur une touche pour fermer..."
  exit 1
fi

# 2. Déjà en marche ?
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  Le serveur Golden Boutique semble déjà ouvert (port $PORT occupé)."
  echo "  Fermez l'autre fenêtre Demarrer-Boutique, puis relancez celle-ci."
  open "http://localhost:$PORT/"
  read -n 1 -s -r -p "  Appuyez sur une touche pour fermer..."
  exit 0
fi

# 3. Compte technique PocketBase (évite la page d'installation de PocketBase)
if [ ! -f "$DIR/pb_data/.compte-technique" ]; then
  mkdir -p "$DIR/pb_data"
  PBPASS="gb-$(LC_ALL=C tr -dc 'a-zA-Z0-9' </dev/urandom | head -c 20)"
  "$DIR/pocketbase" superuser upsert "technique@golden-boutique.local" "$PBPASS" --dir="$DIR/pb_data" >/dev/null 2>&1
  printf "Compte technique PocketBase (http://localhost:%s/_/)\nE-mail : technique@golden-boutique.local\nMot de passe : %s\n" "$PORT" "$PBPASS" > "$DIR/pb_data/.compte-technique"
  chmod 600 "$DIR/pb_data/.compte-technique"
fi

# 4. Adresse du Mac sur le Wi-Fi, pour le lien des téléphones
IP=""
for IF in en0 en1 en2 en3 en4 en5 en6 en7 en8; do
  IP="$(ipconfig getifaddr $IF 2>/dev/null)"
  [ -n "$IP" ] && break
done
write_net() { printf '{"ip":"%s","port":%s,"pub":"%s"}\n' "$IP" "$PORT" "$1" > "$DIR/pb_public/reseau.json"; }
write_net ""

cleanup() {
  [ -n "$CF_PID" ] && kill "$CF_PID" 2>/dev/null
  [ -n "$CAF_PID" ] && kill "$CAF_PID" 2>/dev/null
  [ -n "$PB_PID" ] && kill "$PB_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

# 5. Démarrage du serveur
"$DIR/pocketbase" serve --http="0.0.0.0:$PORT" --dir="$DIR/pb_data" \
  --publicDir="$DIR/pb_public" --migrationsDir="$DIR/pb_migrations" > "$DIR/pb_data/serveur.log" 2>&1 &
PB_PID=$!

OK=0
for i in $(seq 1 40); do
  if curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then OK=1; break; fi
  if ! kill -0 $PB_PID 2>/dev/null; then break; fi
  sleep 0.5
done
if [ $OK != 1 ]; then
  echo "  ERREUR : le serveur n'a pas pu démarrer. Détails :"
  tail -n 15 "$DIR/pb_data/serveur.log"
  read -n 1 -s -r -p "  Appuyez sur une touche pour fermer..."
  exit 1
fi

# Empêche le Mac de se mettre en veille tant que le serveur tourne.
caffeinate -ims -w $PB_PID &
CAF_PID=$!

# 6. Lien Internet (facultatif) si l'outil cloudflared est installé
PUB=""
CF="$(command -v cloudflared || ls /opt/homebrew/bin/cloudflared /usr/local/bin/cloudflared 2>/dev/null | head -n 1)"
if [ -n "$CF" ]; then
  "$CF" tunnel --no-autoupdate --url "http://localhost:$PORT" > "$DIR/pb_data/internet.log" 2>&1 &
  CF_PID=$!
  for i in $(seq 1 40); do
    PUB="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$DIR/pb_data/internet.log" | head -n 1)"
    [ -n "$PUB" ] && break
    sleep 0.5
  done
  write_net "$PUB"
fi

echo "  Le serveur est EN MARCHE.  Ne fermez pas cette fenêtre."
echo ""
echo "  Sur ce Mac        :  http://localhost:$PORT"
if [ -n "$IP" ]; then
  echo "  Téléphones (même Wi-Fi) :  http://$IP:$PORT"
else
  echo "  Le Mac n'est connecté à aucun Wi-Fi : les téléphones ne pourront pas se connecter."
fi
[ -n "$PUB" ] && echo "  Depuis Internet (4G)    :  $PUB"
echo ""
echo "  Le lien et son QR code sont aussi dans le logiciel : Paramètres › Réseau."
echo "  Pour arrêter le serveur : fermez cette fenêtre."
echo ""

open "http://localhost:$PORT/"
wait $PB_PID
