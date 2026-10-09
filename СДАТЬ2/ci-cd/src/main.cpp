#include <filesystem>
#include <fstream>
#include <iostream>
#include <string>
#include <vector>

namespace fs = std::filesystem;

struct Stage {
  std::string name;
  std::string source;
  std::string output;
  std::string tests;
  std::string target;
};

static std::string quoted_after(const std::string& line) {
  auto a = line.find('"');
  if (a == std::string::npos) return "";
  auto b = line.find('"', a + 1);
  if (b == std::string::npos) return "";
  auto c = line.find('"', b + 1);
  if (c == std::string::npos) return "";
  auto d = line.find('"', c + 1);
  if (d == std::string::npos) return "";
  return line.substr(c + 1, d - c - 1);
}

static std::vector<Stage> read_pipeline(const std::string& path) {
  std::ifstream in(path);
  if (!in) throw std::runtime_error("нет файла " + path);
  std::vector<Stage> stages;
  Stage current;
  bool open = false;
  std::string line;
  while (std::getline(in, line)) {
    if (line.find("{") != std::string::npos && line.find("stage") == std::string::npos) continue;
    if (line.find("\"stage\"") != std::string::npos) {
      if (open) stages.push_back(current);
      current = Stage{};
      current.name = quoted_after(line);
      open = true;
    } else if (line.find("\"source\"") != std::string::npos) current.source = quoted_after(line);
    else if (line.find("\"output\"") != std::string::npos) current.output = quoted_after(line);
    else if (line.find("\"tests\"") != std::string::npos) current.tests = quoted_after(line);
    else if (line.find("\"target\"") != std::string::npos) current.target = quoted_after(line);
  }
  if (open) stages.push_back(current);
  if (stages.empty()) throw std::runtime_error("в конфиге нет этапов");
  return stages;
}

static int run_cmd(const std::string& cmd) {
  std::cout << "$ " << cmd << "\n";
  int code = std::system(cmd.c_str());
  if (code != 0) std::cerr << "этап завершился с кодом " << code << "\n";
  return code;
}

static int do_build(const Stage& stage) {
  fs::create_directories(stage.output.empty() ? "bin" : stage.output);
  std::string out = (stage.output.empty() ? "bin" : stage.output) + "/app";
  std::string cmd = "g++ -std=c++17 -O2 -o " + out;
  for (const auto& entry : fs::directory_iterator(stage.source.empty() ? "src" : stage.source)) {
    if (entry.path().extension() == ".cpp" && entry.path().filename() != "main.cpp") cmd += " " + entry.path().string();
  }
  return run_cmd(cmd);
}

static int do_test(const Stage& stage) {
  fs::create_directories("bin");
  int failed = 0;
  int total = 0;
  std::string dir = stage.tests.empty() ? "tests" : stage.tests;
  for (const auto& entry : fs::directory_iterator(dir)) {
    if (entry.path().extension() != ".cpp") continue;
    ++total;
    std::string bin = "bin/" + entry.path().stem().string();
    if (run_cmd("g++ -std=c++17 -O2 -o " + bin + " " + entry.path().string()) != 0) {
      ++failed;
      continue;
    }
    if (run_cmd(bin) != 0) ++failed;
  }
  std::cout << "тесты: " << (total - failed) << " прошло, " << failed << " упало, всего " << total << "\n";
  return failed == 0 && total > 0 ? 0 : 1;
}

static int do_deploy(const Stage& stage) {
  std::string from = (stage.source.empty() ? "bin" : stage.source) + "/app";
  std::string to_dir = stage.target.empty() ? "deploy" : stage.target;
  fs::create_directories(to_dir);
  fs::copy_file(from, to_dir + "/app", fs::copy_options::overwrite_existing);
  std::ofstream report(to_dir + "/report.txt");
  report << "deploy ok\nsource=" << from << "\n";
  std::cout << "отчёт: " << to_dir << "/report.txt\n";
  return 0;
}

static int run_stage(const Stage& stage) {
  std::cout << "== " << stage.name << " ==\n";
  if (stage.name == "build") return do_build(stage);
  if (stage.name == "test") return do_test(stage);
  if (stage.name == "deploy") return do_deploy(stage);
  std::cerr << "неизвестный этап " << stage.name << "\n";
  return 1;
}

int main(int argc, char** argv) {
  try {
    std::vector<std::string> args(argv + 1, argv + argc);
    if (args.size() >= 2 && args[0] == "run" && args[1] == "--config" && args.size() >= 3) {
      for (const auto& stage : read_pipeline(args[2])) {
        if (run_stage(stage) != 0) return 1;
      }
      return 0;
    }
    if (args.size() >= 1 && (args[0] == "build" || args[0] == "test" || args[0] == "deploy")) {
      Stage stage;
      stage.name = args[0];
      for (size_t i = 1; i + 1 < args.size(); i += 2) {
        if (args[i] == "--source") stage.source = args[i + 1];
        if (args[i] == "--output") stage.output = args[i + 1];
        if (args[i] == "--tests") stage.tests = args[i + 1];
        if (args[i] == "--target") stage.target = args[i + 1];
      }
      return run_stage(stage);
    }
    std::cerr << "ci-cd run --config pipeline.json\n";
    return 2;
  } catch (const std::exception& ex) {
    std::cerr << ex.what() << "\n";
    return 1;
  }
}
