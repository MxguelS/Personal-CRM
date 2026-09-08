FROM n8nio/n8n:latest

USER root
COPY workflows /opt/kinfolk/workflows
COPY docker-entrypoint-kinfolk.sh /opt/kinfolk/docker-entrypoint-kinfolk.sh
RUN chmod +x /opt/kinfolk/docker-entrypoint-kinfolk.sh
USER node

ENTRYPOINT ["/opt/kinfolk/docker-entrypoint-kinfolk.sh"]
