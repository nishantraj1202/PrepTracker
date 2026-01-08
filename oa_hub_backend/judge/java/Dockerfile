FROM eclipse-temurin:17-jdk

WORKDIR /app

# Copy to root to avoid being overwritten by volume mount at /app
COPY run.sh /run.sh
RUN chmod +x /run.sh && sed -i 's/\r$//' /run.sh

ENTRYPOINT ["/run.sh"]