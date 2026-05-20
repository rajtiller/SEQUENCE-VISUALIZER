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

std::pair<int,int> number_to_square(int x) {
    int s = floor(sqrt(x));
    if (s %2 == 1) {
        if (x == s*s) {
            return std::make_pair((s-1)/2,-(s-1)/2);
        }
        else if (x <= (s*s+s)) {
            return std::make_pair((s+1)/2,-(s+1)/2+x-(s*s));
        } else {
            return std::make_pair((s+3)/2-(x-s*s-s),(s+1)/2);
        }
    }
    else {
        if (x == s*s) {
            return std::make_pair(-s/2+1,s/2);
        }
        int new_x = -1;
        if (x == s*s+1) {
            new_x = x+2*s;
        }
        else {
            new_x = x-2*s;
        }
        std::pair<int,int> counter_pair = number_to_square(new_x);
        return std::make_pair(-counter_pair.first, -counter_pair.second);
    }
}

int square_to_number(std::pair<int,int> square) {
    int x = square.first;
    int y = square.second;
    int k = max(abs(x), abs(y));
    int s = 2*k+1;
    if (y == -k) {
        return s*s-(k-x);
    } else if (x == -k) {
        return s*s-(s-1)-(k+y);
    } else if (y == k) {
        return s*s-2*(s-1)-(k+x);
    } else {
        return s*s-3*(s-1)-(k-y);
    }
}

double knight_problem () {
    auto start = std::chrono::high_resolution_clock::now();
    auto points = std::vector<std::pair<int, int>>();

    std::set<std::pair<int, int>> visited;

    std::pair<int, int> current_position = std::make_pair(0, 0);

    while (true) {
        visited.insert(current_position);
        points.push_back(current_position);
        std::pair<int, int> smallest_move = std::make_pair(0, 0);
        int smallest_so_far = std::numeric_limits<int>::max();
        for (int i = 0; i < 8; i++) {
            int first_move = (i & 0b001)+1;
            first_move = (i&0b100) ? first_move : (-first_move);
            int second_move = 3-first_move;
            second_move = (i&0b010) ? second_move : (-second_move);
            auto new_position = std::make_pair(current_position.first + first_move, current_position.second + second_move);
            if (visited.find(new_position) == visited.end() && (square_to_number(new_position) < smallest_so_far)) {
                smallest_move = new_position;
                smallest_so_far = square_to_number(new_position);
            }
        }
        if (smallest_so_far == std::numeric_limits<int>::max()) {
            break;
        }
        current_position = smallest_move;
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
    
    knight_problem();
    std::cout << square_to_number(std::make_pair(13, 6)) << std::endl;
    
    return 0;
}
