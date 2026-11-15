FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace/backend
COPY backend/mvnw backend/pom.xml ./
COPY backend/.mvn .mvn
RUN chmod +x mvnw
COPY backend/src src
COPY _bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml /workspace/_bmad-output/planning-artifacts/architecture/architecture-employee-leave-demo-2026-11-13/contracts/openapi.yaml
RUN ./mvnw -B -Dmaven.test.skip=true package

FROM eclipse-temurin:25-jre AS runtime
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /workspace/backend/target/employee-leave-api.jar /app/employee-leave-api.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/employee-leave-api.jar"]
