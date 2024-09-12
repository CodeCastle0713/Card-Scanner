const express = require("express");
const bodyParser = require("body-parser");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");

const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const extractCardInfo = async (text) => {
  const cardInfo = {};
  console.log("TEXT : ", text);
  const lines = text.split("\n");

  for (const line of lines) {
    const numberMatch = line.match(/\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/);
    if (numberMatch) {
      cardInfo.number = numberMatch[0];
      break;
    }
  }

  for (const line of lines) {
    const expirationMatch = line.match(
      /\b((0[0-9]|1[0-2])(\/|-)(\d{2}|\d{4})|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s](\d{2}|\d{4}))\b/
    );

    if (expirationMatch) {
      cardInfo.expiration = expirationMatch[0];
      break;
    }
  }

  for (const line of lines) {
    const cvvMatch = line.match(/^[0-9]{3,4}$/);

    if (cvvMatch) {
      cardInfo.cvv = cvvMatch[0];
      break;
    }
  }

  for (const line of lines) {
    const nameMatch = line.match(/^[A-Z][a-zA-Z]*\s([A-Z]\.\s)?[A-Z][a-zA-Z]*$/) ||
                      line.match(/^[A-Z\s]+$/);

    if (
      nameMatch &&
      !nameMatch[0].toLowerCase().includes("visa") &&
      !nameMatch[0].toLowerCase().includes("master") &&
      !nameMatch[0].toLowerCase().includes("debit") &&
      !nameMatch[0].toLowerCase().includes("credit")
      // !nameMatch[0].toLowerCase().includes("card")
    ) {
      cardInfo.name = nameMatch[0];
      break;
    }
  }

  return cardInfo;
};

app.post("/process-card-by-cv", async (req, res) => {
  const { image } = req.body;
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  
  try {
    const processedBuffer = await sharp(buffer)
      .greyscale()
      .blur(1)
      .linear(1.0, -128)
      .resize({ width: 2 * 600 })
      .median(3)
      .threshold(128)
      .toBuffer();

    const processedBase64 = processedBuffer.toString("base64");

    const {
      data: { text },
    } = await Tesseract.recognize(
      `data:image/png;base64,${processedBase64}`,
      "eng",
      {
        logger: (m) => console.log(m),
      }
    );

    const cardInfo = await extractCardInfo(text);

    return res.json(cardInfo);
  } catch (error) {
    console.error("Error processing card:", error);
    return res.status(500).json({ error: "Failed to process card image" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});