const http = require("http");
const https = require("https");

const GROQ_API_KEY = "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";

const PORT = 3001;

const server = http.createServer((req, res) => {

  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/api/ai") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);

        // Build messages — add system as first message if provided
        const messages = [];
        if (parsed.system) {
          messages.push({ role: "system", content: parsed.system });
        }
        messages.push(...parsed.messages);

        const payload = JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2048,
          temperature: 1.0,
          messages: messages,
        });

        const options = {
          hostname: "api.groq.com",
          path: "/openai/v1/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Length": Buffer.byteLength(payload),
          },
        };

        const proxyReq = https.request(options, (proxyRes) => {
          let data = "";
          proxyRes.on("data", chunk => { data += chunk; });
          proxyRes.on("end", () => {
            console.log(`[${new Date().toLocaleTimeString()}] Status: ${proxyRes.statusCode}`);

            try {
              const groqResponse = JSON.parse(data);

              if (proxyRes.statusCode !== 200) {
                console.error("Groq error:", data);
                res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: groqResponse.error?.message || "API error" }));
                return;
              }

              // Convert Groq response to Anthropic-like format so quiz.js works unchanged
              const text = groqResponse.choices?.[0]?.message?.content || "";
              const converted = {
                content: [{ type: "text", text: text }]
              };

              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(converted));

            } catch (e) {
              console.error("Parse error:", e.message);
              res.writeHead(500);
              res.end(JSON.stringify({ error: "Failed to parse response" }));
            }
          });
        });

        proxyReq.on("error", (err) => {
          console.error("Request failed:", err.message);
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Request failed" }));
        });

        proxyReq.write(payload);
        proxyReq.end();

      } catch (err) {
        console.error("Parse error:", err.message);
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Invalid request" }));
      }
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, () => {
  console.log("✅ EduQuest server running on http://localhost:" + PORT);
});