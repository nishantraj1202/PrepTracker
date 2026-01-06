FROM gcc:latest

WORKDIR /app

# Copy to root to avoid being overwritten by volume mount at /app
COPY run.sh /run.sh

RUN chmod +x /run.sh && sed -i 's/\r$//' /run.sh

# User code will be mounted to /app/Main.cpp
ENTRYPOINT ["/run.sh"]
