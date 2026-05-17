import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const defaultHistoryPath = join(root, "data", "reviews.json");

export class HistoryStore {
  constructor(filePath = defaultHistoryPath) {
    this.filePath = filePath;
  }

  async createReview({ inputType, inputValue, inputRaw = "", context = "", result }) {
    const reviews = await this.#readReviews();
    const record = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      inputType,
      inputValue,
      inputRaw,
      context,
      result
    };

    reviews.unshift(record);
    await this.#writeReviews(reviews.slice(0, 100));
    return record;
  }

  async listReviews(limit = 20) {
    const reviews = await this.#readReviews();
    return reviews.slice(0, limit).map((review) => ({
      id: review.id,
      createdAt: review.createdAt,
      inputType: review.inputType,
      inputValue: review.inputValue,
      riskLevel: review.result.riskLevel,
      riskScore: review.result.riskScore,
      findingCount: review.result.findings?.length || 0,
      source: review.result.source || null,
      provider: review.result.provider || "unknown",
      model: review.result.model || null
    }));
  }

  async getReview(id) {
    const reviews = await this.#readReviews();
    return reviews.find((review) => review.id === id) || null;
  }

  async #readReviews() {
    try {
      const data = await readFile(this.filePath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async #writeReviews(reviews) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(reviews, null, 2));
  }
}

export const historyStore = new HistoryStore();
