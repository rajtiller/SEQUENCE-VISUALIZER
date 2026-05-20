#include <cmath>
#include <fstream>
#include <iostream>
#include <vector>
#include <cassert>
#include <set>
#include <chrono>
#include <unordered_set>

int max(int a, int b) {
    return a > b ? a : b;
}

double largest_prime_factor_quick(int n) {
    auto start = std::chrono::high_resolution_clock::now();

    std::set<int> primes = {2,3};
    std::vector<std::pair<double, double>> points;
    points.push_back({0, 0});
    points.push_back({1, 1});
    for (int num = 2; num <= n; num++) {
        for (auto prime : primes) {
            if (prime > sqrt(num)) {
                points.push_back({num, num});
                primes.insert(num);
                break;
            }
            if (num % prime == 0) {
                int largest_prime_factor = max(prime,points[num/prime].second);
                points.push_back({num, largest_prime_factor});
                break;
            }
        }
    }
    auto end = std::chrono::high_resolution_clock::now();
    std::ofstream file("largest_prime_factor_points.csv");
    for (const auto& point : points) {
        file << point.first << " " << point.second << std::endl;
    }
    return std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();

}

double knight_problem () {
    auto start = std::chrono::high_resolution_clock::now();
    auto points = std::vector<std::pair<int, int>>();

    std::unordered_set<std::pair<int, int>> visited;

    std::pair<int, int> current_position = {0, 0};

    while (true) {
        
    }
    auto end = std::chrono::high_resolution_clock::now();
    std::ofstream file("knight_problem_points.csv");
    for (const auto& point : points) {
        file << point.first << " " << point.second << std::endl;
    }
    return std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
}

int main() {
    // largest_prime_factor_1(1000000);
    std::cout << "Largest prime factor for 1000: " << largest_prime_factor_quick(1000) << " seconds" << std::endl;
    
    return 0;
}
