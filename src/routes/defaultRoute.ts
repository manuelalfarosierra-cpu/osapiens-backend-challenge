import express from "express";
import fs from "fs";
import path from "path";
import { marked } from "marked";

const router = express.Router();
const staticPath = path.join(__dirname, "../../public");
router.use("/public", express.static(staticPath));

router.get("/", (req, res) => {
  const readmePath = path.join(__dirname, "../..", "README.md");
  fs.readFile(readmePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading README.md:", err);
      return res.status(500).send("Error loading README.md");
    }
    const htmlContent = marked(data);
    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  });
});

export default router;
