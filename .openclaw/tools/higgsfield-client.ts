#!/usr/bin/env node

/**
 * HiggsField AI Client Tool for OpenClaw Agent
 * Personal tool for generating visual content during development
 */

import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

class HiggsFieldDevTool {
  constructor() {
    this.apiKey = process.env.HIGGSFIELD_API_KEY;
    this.apiSecret = process.env.HIGGSFIELD_API_SECRET;
    this.baseUrl = "https://platform.higgsfield.ai";

    if (!this.apiKey || !this.apiSecret) {
      console.error("⚠️ HiggsField credentials not found in environment");
      console.log("Set HIGGSFIELD_API_KEY and HIGGSFIELD_API_SECRET");
      process.exit(1);
    }
  }

  /**
   * Generate scientific illustration for development
   */
  async generateForDevelopment(prompt, options = {}) {
    const enhancedPrompt = `Scientific illustration: ${prompt}, highly detailed, professional quality, clean background, educational style, 8k resolution`;

    const requestData = {
      prompt: enhancedPrompt,
      aspect_ratio: options.aspectRatio || "16:9",
      resolution: options.resolution || "2K",
      model: options.model || "higgsfield-ai/soul/standard",
    };

    console.log(`🎨 Generating: ${prompt}`);
    console.log(
      `📐 Format: ${requestData.aspect_ratio} @ ${requestData.resolution}`,
    );

    try {
      const response = await fetch(`${this.baseUrl}/${requestData.model}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${this.apiKey}:${this.apiSecret}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ Request queued: ${result.request_id}`);

      // Wait for completion
      const completed = await this.waitForCompletion(result.request_id);

      if (completed.images && completed.images.length > 0) {
        console.log(`🖼️ Generated ${completed.images.length} image(s)`);
        return completed.images;
      }

      throw new Error("No images generated");
    } catch (error) {
      console.error("❌ Generation failed:", error.message);
      throw error;
    }
  }

  /**
   * Wait for generation to complete
   */
  async waitForCompletion(requestId, maxWaitTime = 300000) {
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < maxWaitTime) {
      attempt++;

      try {
        const response = await fetch(
          `${this.baseUrl}/requests/${requestId}/status`,
          {
            headers: {
              Authorization: `Key ${this.apiKey}:${this.apiSecret}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(`Status check failed: ${response.status}`);
        }

        const status = await response.json();

        console.log(`⏳ Attempt ${attempt}: ${status.status}`);

        if (status.status === "completed") {
          return status;
        }

        if (status.status === "failed" || status.status === "nsfw") {
          throw new Error(`Generation failed: ${status.status}`);
        }

        // Wait 5 seconds between checks
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`Status check attempt ${attempt} failed:`, error.message);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    throw new Error("Generation timeout");
  }

  /**
   * Download images to local directory
   */
  async downloadImages(images, outputDir = "./generated-content") {
    await fs.mkdir(outputDir, { recursive: true });

    const downloads = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const filename = `generated-${Date.now()}-${i + 1}.jpg`;
      const filepath = path.join(outputDir, filename);

      try {
        const response = await fetch(image.url);
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const buffer = await response.buffer();
        await fs.writeFile(filepath, buffer);

        console.log(`💾 Saved: ${filepath}`);
        downloads.push(filepath);
      } catch (error) {
        console.error(`❌ Failed to download image ${i + 1}:`, error.message);
      }
    }

    return downloads;
  }

  /**
   * Generate content for landing page sections
   */
  async generateLandingContent() {
    const prompts = [
      {
        name: "hero-background",
        prompt:
          "Abstract scientific background with molecular structures, DNA helix, neural networks, professional medical blue theme",
        aspectRatio: "16:9",
      },
      {
        name: "ai-brain-visualization",
        prompt:
          "Artistic visualization of AI brain, neural network connections, synapses, futuristic medical technology",
        aspectRatio: "1:1",
      },
      {
        name: "research-workflow",
        prompt:
          "Scientific research workflow diagram, laboratory equipment, data analysis, research process illustration",
        aspectRatio: "16:9",
      },
      {
        name: "medical-innovation",
        prompt:
          "Modern medical research, combining traditional medicine with AI technology, innovation in healthcare",
        aspectRatio: "4:3",
      },
    ];

    console.log("🚀 Generating landing page content...");

    const results = [];

    for (const item of prompts) {
      try {
        console.log(`\n📝 Creating: ${item.name}`);
        const images = await this.generateForDevelopment(item.prompt, {
          aspectRatio: item.aspectRatio,
        });

        const downloads = await this.downloadImages(
          images,
          `./generated-content/landing/${item.name}`,
        );

        results.push({
          name: item.name,
          prompt: item.prompt,
          files: downloads,
          success: true,
        });
      } catch (error) {
        console.error(`❌ Failed to generate ${item.name}:`, error.message);
        results.push({
          name: item.name,
          error: error.message,
          success: false,
        });
      }
    }

    return results;
  }

  /**
   * Generate icons and UI elements
   */
  async generateUIElements() {
    const elements = [
      {
        name: "feature-icons",
        prompt:
          "Set of scientific feature icons: microscope, DNA, brain, graph, molecule, lab equipment, minimalist style",
        aspectRatio: "1:1",
      },
      {
        name: "service-illustrations",
        prompt:
          "Medical service illustrations: patient care, research analysis, data processing, telemedicine",
        aspectRatio: "4:3",
      },
    ];

    console.log("🎨 Generating UI elements...");

    const results = [];

    for (const element of elements) {
      try {
        console.log(`\n🔧 Creating: ${element.name}`);
        const images = await this.generateForDevelopment(element.prompt, {
          aspectRatio: element.aspectRatio,
          resolution: "1080p",
        });

        const downloads = await this.downloadImages(
          images,
          `./generated-content/ui/${element.name}`,
        );

        results.push({
          name: element.name,
          files: downloads,
          success: true,
        });
      } catch (error) {
        console.error(`❌ Failed to generate ${element.name}:`, error.message);
        results.push({
          name: element.name,
          error: error.message,
          success: false,
        });
      }
    }

    return results;
  }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const tool = new HiggsFieldDevTool();
  const command = process.argv[2];

  switch (command) {
    case "landing":
      await tool.generateLandingContent();
      break;

    case "ui":
      await tool.generateUIElements();
      break;

    case "custom":
      const prompt = process.argv.slice(3).join(" ");
      if (!prompt) {
        console.error("❌ Please provide a prompt");
        console.log(
          'Usage: node higgsfield-client.ts custom "your prompt here"',
        );
        process.exit(1);
      }

      try {
        const images = await tool.generateForDevelopment(prompt);
        const downloads = await tool.downloadImages(images);
        console.log(`✅ Generated ${downloads.length} images`);
      } catch (error) {
        console.error("❌ Generation failed:", error.message);
        process.exit(1);
      }
      break;

    default:
      console.log("🔧 HiggsField Development Tool");
      console.log("");
      console.log("Usage:");
      console.log(
        "  node higgsfield-client.ts landing    - Generate landing page content",
      );
      console.log(
        "  node higgsfield-client.ts ui         - Generate UI elements",
      );
      console.log(
        '  node higgsfield-client.ts custom "prompt" - Custom generation',
      );
      console.log("");
      console.log("Environment variables required:");
      console.log("  HIGGSFIELD_API_KEY");
      console.log("  HIGGSFIELD_API_SECRET");
  }
}

export default HiggsFieldDevTool;
