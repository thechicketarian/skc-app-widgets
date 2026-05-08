import fs from "fs";

export default function handler(req, res) {
  const filePath = process.env.VERCEL === "1"
    ? "/tmp/starting-eleven.png"
    : "public/starting-eleven.png";

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("PNG not generated yet");
  }

  const img = fs.readFileSync(filePath);
  res.setHeader("Content-Type", "image/png");
  res.send(img);
}
