#!/usr/bin/env bash
set -e

# Update postgresql.conf to listen on all interfaces
PG_CONF=$(ls /etc/postgresql/*/main/postgresql.conf | head -n 1)
PG_HBA=$(ls /etc/postgresql/*/main/pg_hba.conf | head -n 1)

sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"
sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"

sed -i "s/scram-sha-256/trust/g" "$PG_HBA"
sed -i "s/md5/trust/g" "$PG_HBA"
if ! grep -q "0.0.0.0/0" "$PG_HBA"; then
    echo "host all all 0.0.0.0/0 trust" >> "$PG_HBA"
    echo "host all all ::0/0 trust" >> "$PG_HBA"
fi

# Update redis config
if [ -f /etc/redis/redis.conf ]; then
    sed -i "s/^bind 127.0.0.1 ::1/bind 0.0.0.0/" /etc/redis/redis.conf
    sed -i "s/^protected-mode yes/protected-mode no/" /etc/redis/redis.conf
fi

service postgresql restart
service redis-server restart

# Ensure postgres password is set
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Ensure database exists
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw campus_complaints; then
    sudo -u postgres createdb campus_complaints -O postgres
    echo "Database campus_complaints created."
else
    echo "Database campus_complaints already exists."
fi

echo "PostgreSQL and Redis fully configured and listening on 0.0.0.0."
