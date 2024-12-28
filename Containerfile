FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder

COPY . /opt/app-root/src

RUN npm ci && \
    npm run build

FROM registry.access.redhat.com/ubi9/nginx-124

COPY --from=builder /opt/app-root/src/dist /tmp/src/
COPY nginx.conf  /opt/app-root/etc/nginx.default.d/nginx.conf

# Assemble the image
RUN /usr/libexec/s2i/assemble

# Set the default command for the resulting image
CMD /usr/libexec/s2i/run
