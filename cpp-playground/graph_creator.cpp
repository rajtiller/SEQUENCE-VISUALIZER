#include <cmath>
#include <fstream>
#include <iostream>
#include <vector>
#include <cassert>
#include <set>
#include <chrono>

std::vector<std::pair<double, double>> points;

std::set<int> primes = {2,3};

bool is_prime(int n) {
    if (n <= 3 || primes.find(n) != primes.end()) {
        return true;
    }
    return false;
}

int max(int a, int b) {
    return a > b ? a : b;
}

void largest_prime_factor_1(int n) {
    for (int num = 1; num <= n; num++) {
        int largest_factor = 1;
        for (int pot_factor = 2; pot_factor <= sqrt(num); pot_factor++) {
            int inverse_factor = num / pot_factor;
            assert(inverse_factor >= pot_factor);
            if (is_prime(inverse_factor) && (num % inverse_factor == 0)) {
                largest_factor = max(largest_factor, inverse_factor);
            }
            else if (is_prime(pot_factor) && (num % pot_factor == 0)) {
                largest_factor = max(largest_factor, pot_factor);
            }
        }
        if (largest_factor > 1) {
            points.push_back({num, largest_factor});
        }
        else {
            points.push_back({num, num});
            primes.insert(num);
        }
    }
}

void largest_prime_factor_2(int n) {
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
}

int main() {
    auto start = std::chrono::high_resolution_clock::now();
    // largest_prime_factor_1(1000000);
    auto end = std::chrono::high_resolution_clock::now();
    std::cout << "Time taken 1: " << std::chrono::duration_cast<std::chrono::seconds>(end - start).count() << " seconds" << std::endl;
    start = std::chrono::high_resolution_clock::now();
    largest_prime_factor_2(1000);
    end = std::chrono::high_resolution_clock::now();
    std::cout << "Time taken 2: " << std::chrono::duration_cast<std::chrono::seconds>(end - start).count() << " seconds" << std::endl;

    std::ofstream file("largest_prime_factor_points.csv");
    for (const auto& point : points) {
        file << point.first << " " << point.second << std::endl;
    }
    return 0;
}
