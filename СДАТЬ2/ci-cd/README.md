# Локальный CI/CD

Сборка, тесты и выкладка без sudo. JSON разбирается своим разбором строк stage/source/output/tests/target.

```
g++ -std=c++17 -O2 -o ci-cd src/main.cpp
./ci-cd run --config pipeline.json
```
