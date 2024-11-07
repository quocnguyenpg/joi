import { Octokit } from "@octokit/rest";
import { OpenAI } from "openai";

// Set up environment variables
const openaiApiKey = process.env.OPEN_AI_KEY;
const githubToken = process.env.GITHUB_TOKEN;
const repoName = process.env.GITHUB_REPOSITORY;
const refParts = process.env.GITHUB_REF.split("/");
const prNumber = refParts.includes("pull") ? refParts[refParts.indexOf("pull") + 1] : null;

// Initialize GitHub and OpenAI clients
const octokit = new Octokit({ auth: githubToken });
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiApiKey,
});

// Fetch the pull request diff
async function getPullRequestDiff() {
  const [owner, repo] = repoName.split("/");
  console.log("Owner:", owner, "Repo:", repo, "Pull Number:", prNumber);

  try {
    const { data } = await octokit.request(`GET /repos/{owner}/{repo}/pulls/{pull_number}`, {
      owner,
      repo,
      pull_number: prNumber,
      headers: {
        accept: "application/vnd.github.v3.diff",
      },
    });
    return data;
  } catch (error) {
    console.error("Error fetching PR diff:", error);
    throw error;
  }
}

// Review the code diff using ChatGPT
async function reviewCodeWithChatGPT(diff) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Please review the following code diff and suggest any potential code refactoring, optimizations, or improvements, along with constructive feedback:\n\n${diff}`,
      },
    ],
  });
  return response.choices[0].message.content;
}

// Post the review as a comment on the pull request
async function postReviewComment(review) {
  const [owner, repo] = repoName.split("/");
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: review,
  });
}

// Main function
(async function main() {
  try {
    // Extract the pull request number
    

    if (!prNumber) {
      throw new Error("Pull request number not found in GITHUB_REF");
    }

    console.log("Pull Request Number:", prNumber);

    const diff = await getPullRequestDiff();
    const review = await reviewCodeWithChatGPT(diff);
    await postReviewComment(review);
    console.log("Review posted successfully!");
  } catch (error) {
    console.error("Error in ChatGPT review:", error);
  }
})();
