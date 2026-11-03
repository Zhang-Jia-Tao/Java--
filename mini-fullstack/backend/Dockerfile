# 多阶段构建：maven 里编译，JRE 里运行，镜像里不带源码与构建工具
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# 先只拷 pom，把依赖下载放进独立层，改代码时不必重下依赖
COPY pom.xml .
RUN mvn -q -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app

# 非 root 运行；上传目录提前建好并授权
RUN useradd -r -u 10001 appuser \
 && mkdir -p /data/uploads \
 && chown -R appuser:appuser /data
USER appuser
VOLUME ["/data/uploads"]

COPY --from=build /app/target/*.jar /app/app.jar
EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
