// Test the built package
const { api, createApiClient } = require("./dist/index.js");

async function test() {
  console.log("Testing nanofetch...\n");

  try {
    // Test 1: Basic GET request
    console.log("Test 1: GET request to JSONPlaceholder API");
    const response = await api.get(
      "https://jsonplaceholder.typicode.com/users/1",
    );
    console.log("✅ Success!");
    console.log("Status:", response.status);
    console.log("Data:", response.data);
    console.log("");

    // Test 2: GET with query params
    console.log("Test 2: GET with query params");
    const postsResponse = await api.get(
      "https://jsonplaceholder.typicode.com/posts",
      {
        params: { userId: 1, _limit: 3 },
      },
    );
    console.log("✅ Success!");
    console.log("Status:", postsResponse.status);
    console.log("Number of posts:", postsResponse.data.length);
    console.log("");

    // Test 3: POST request
    console.log("Test 3: POST request");
    const postResponse = await api.post(
      "https://jsonplaceholder.typicode.com/posts",
      {
        title: "Testing nanofetch",
        body: "This is a test from nanofetch",
        userId: 1,
      },
    );
    console.log("✅ Success!");
    console.log("Status:", postResponse.status);
    console.log("Created post ID:", postResponse.data.id);
    console.log("");

    // Test 4: Custom instance with baseURL
    console.log("Test 4: Custom instance with baseURL");
    const customApi = createApiClient({
      baseURL: "https://jsonplaceholder.typicode.com",
    });
    const todoResponse = await customApi.get("/todos/1");
    console.log("✅ Success!");
    console.log("Status:", todoResponse.status);
    console.log("Todo:", todoResponse.data);
    console.log("");

    console.log("🎉 All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

test();
