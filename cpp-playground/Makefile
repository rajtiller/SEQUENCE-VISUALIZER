# graph_creator — C++ playground binary
# Usage: make | make clean | make run

CXX      ?= c++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -pedantic -O2

TARGET   := graph_creator
SRCS     := graph_creator.cpp
OBJS     := $(SRCS:.cpp=.o)

.PHONY: all clean run

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CXX) $(LDFLAGS) -o $@ $^

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -c $< -o $@

clean:
	rm -f $(TARGET) $(OBJS) largest_prime_factor_points.csv

run: $(TARGET)
	./$(TARGET)
