FROM postgres:13.5
COPY ./scripts/init.sql /docker-entrypoint-initdb.d/
WORKDIR /usr/esc_app
#ENV POSTGRES_USER esc
#ENV POSTGRES_PASSWORD mysecret
#ENV POSTGRES_DB esc