let step = false;
const endpoint = "http://localhost:8080/captureImage";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    
    const video = document.querySelector("#camera-stream");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("getUserMedia is not supported in this browser.");
    }

    /**
     * Start the camera and get stream of the camera.
     */
    const constraints = {
      video: {
        facingMode: { ideal: "environment" },
        width: { max: 4096 },
        height: { max: 2160 },
      },
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.play();

    /**
     * Occur whenever you can't see the application on the screen.
     */
    window.addEventListener("pagehide", () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    });

    /**
     * Occur whenever camera starts to work.
     */
    await new Promise((resolve) => {
      video.addEventListener("canplay", resolve, { once: true });
    });

    document
      .querySelector("#left-arrow-button")
      .addEventListener("click", () => {
        step = false;
        document.querySelector("#card-step").innerText = "Scan Card (1/2) ";
        document.querySelector("#initial-alert").style.display = "none";
        document.querySelector("#completed-alert").style.display = "none";
        document.querySelector("#spinner").style.display = "inline-block";
        document.querySelector("#card-box").style.border = "2px solid #FFFFFF";
        document.querySelector("#card-status-content").innerText = "Keep it in frame while we’re processing...";
        processFrames();

        // CSS Setting
        const strokes = document.querySelectorAll("#left-arrow-button path");
        strokes.forEach((stroke) => {
          stroke.setAttribute("stroke", "#000000");
        });
        setTimeout(() => {
          strokes.forEach((stroke) => {
            stroke.setAttribute("stroke", "#FFFFFF");
          });
        }, 50);
        ///////////////////
      });

    document
      .querySelector("#reset-button")
      .addEventListener("click", () => {
        adjustCardBox();

        // CSS Setting
        const strokes = document.querySelectorAll("#reset-button path");
        strokes.forEach((stroke) => {
          stroke.setAttribute("stroke", "#000000");
        });
        setTimeout(() => {
          strokes.forEach((stroke) => {
            stroke.setAttribute("stroke", "#FFFFFF");
          });
        }, 50);
        //////////////////////
      });

    processFrames();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

const adjustCardBox = () => {
  const cardBox = document.querySelector("#card-box");
  const { width, height } = cardBox.getBoundingClientRect();
  cardBox.style.width = height - 4 + "px";
  cardBox.style.height = width - 4 + "px";
};

const processFrames = () => {
  console.log("Process Frames Start...");
  document.querySelector("#initial-alert").style.display = "none";
  document.querySelector("#completed-alert").style.display = "none";
  document.querySelector("#spinner").style.display = "inline-block";
  document.querySelector("#card-status-content").innerText = "Keep it in frame while we’re processing...";

  const interval = setInterval(async () => {
    try {
      
      const imageData = getCardImage();
      const [hasCard, cardImage] = await isThereCard(imageData);

      if(hasCard) {
        clearInterval(interval);

        document.querySelector("#initial-alert").style.display = "none";
        document.querySelector("#spinner").style.display = "none";
        document.querySelector("#completed-alert").style.display = "inline-block";

        document.querySelector("#card-box").style.border = "2px solid #22C215";
        document.querySelector("#card-status-content").innerText = "Done";

        clean_cardImage = cardImage.replace("data:image/jpeg;base64,", "")

        console.log(clean_cardImage)
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: clean_cardImage }),
        });

        const data = await response.json();
        const { card_number, cvv, expiration_date, cardholder_name } = data;

        // card_number = card_number == null ? "Not detected" : card_number;
        // cvv = cvv == null ? "Not detected" : cvv;
        // expiration_date = expiration_date == null ? "Not detected" : expiration_date;
        // cardholder_name = cardholder_name == null ? "Not detected" : cardholder_name;

        alert(
          "Card Number : " + card_number + "\n" + 
          "CVV : " + cvv + "\n" +
          "Expire Date : " + expiration_date + "\n" +
          "Card Name : " + cardholder_name
        );

        await setTimeout(()=>{
          step = !step;
          if (step) {
            document.querySelector("#card-step").innerText = "Scan Card (2/2)";

            document.querySelector("#initial-alert").style.display = "none";
            document.querySelector("#completed-alert").style.display = "none";
            document.querySelector("#spinner").style.display = "inline-block";
            document.querySelector("#card-box").style.border = "2px solid #FFFFFF";
            document.querySelector("#card-status-content").innerText = "Keep it in frame while we’re processing...";
            processFrames();
          }
        },2000)
      }
      // if (imageData) {
      //   clearInterval(interval);

      //   const response = await fetch(endpoint, {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({ image: imageData }),
      //   });

      //   const data = await response.json();
      //   const { number, expiration, cvv, name, error } = data;

      //   if (error) {
      //     cardInformation.innerHTML = error;
      //     return;
      //   }

      //   alert(number + expiration + cvv + name);
      // }
    } catch (error) {
      // step = !step;

      // if (step) {
      //   document.querySelector("#card-step").innerText = "Scan Card (2/2)";
      //   document.querySelector("#card-box").style.border = "2px solid white";
      //   processFrames();
      // }
      console.error(error);
    }
  }, 1000);
};

const getCardImage = () => {
  // const canvas = document.createElement("canvas");
  // const context = canvas.getContext("2d", { willReadFrequently: true });

  // const video = document.querySelector("#camera-stream");
  // const cardBox = document.querySelector("#card-box");

  // const cardBoxRect = cardBox.getBoundingClientRect();

  // const cardBoxWidth = cardBoxRect.width;
  // const cardBoxHeight = cardBoxRect.height;
  // const relativeX = (video.videoWidth - cardBoxWidth) / 2;
  // const relativeY = (video.videoHeight - cardBoxHeight) / 2;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  const video = document.querySelector("#camera-stream");
  const cardBox = document.querySelector("#card-box");

  const cardBoxRect = cardBox.getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();

  const ratio = video.videoHeight > video.videoWidth ? video.videoHeight / videoRect.height : video.videoWidth / videoRect.width;
  // const ratio = video.videoHeight / videoRect.height;

  const cardBoxWidth = cardBoxRect.width;
  const cardBoxHeight = cardBoxRect.height;
  const relativeX = (video.videoWidth - cardBoxWidth) / 2;
  const relativeY = (video.videoHeight - cardBoxHeight) / 2;

  // console.log(videoRect.width);
  // console.log(videoRect.height);
  // console.log(video.videoWidth);
  // console.log(video.videoHeight);
  // console.log(cardBoxWidth);
  // console.log(cardBoxHeight);
  // console.log(relativeX);
  // console.log(relativeY);

  canvas.width = cardBoxWidth;
  canvas.height = cardBoxHeight;

  if (canvas.width === 0 || canvas.height === 0) {
    throw new Error("Canvas dimensions are not set correctly.");
  }

  context.drawImage(
    video,
    relativeX,
    relativeY,
    cardBoxWidth + 4,
    cardBoxHeight + 4,
    0,
    0,
    cardBoxWidth,
    cardBoxHeight
  );

  if (
    context.getImageData(0, 0, canvas.width, canvas.height).data.length ===
    0
  ) {
    throw new Error("No image data available.");
  }
  const imageData = canvas.toDataURL("image/jpeg");
  // const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
  return imageData;
}

function isThereCard(base64Image) {
  return new Promise((resolve, reject) => {
      let imgElement = new Image();
      imgElement.src = base64Image;
      imgElement.onload = function () {
          let src = cv.imread(imgElement);
          let gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

          let edges = new cv.Mat();
          cv.Canny(gray, edges, 100, 200);

          let contours = new cv.MatVector();
          let hierarchy = new cv.Mat();
          cv.findContours(edges, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

          let cardContour = null;
          let maxArea = 0;
          let hasCard = false;

          for (let i = 0; i < contours.size(); i++) {
              let contour = contours.get(i);
              let approx = new cv.Mat();
              cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true);

              if (approx.rows === 4) {
                  let area = cv.contourArea(approx);
                  let rect = cv.boundingRect(approx);
                  let aspectRatio = rect.width / rect.height;
                  let isCardLike = aspectRatio > 0.6 && aspectRatio < 1.7 && area > 5000;

                  if (isCardLike && area > maxArea) {
                      maxArea = area;
                      if (cardContour) {
                          cardContour.delete();
                      }
                      cardContour = approx;
                      hasCard = true;
                  } else {
                      approx.delete();
                  }
              } else {
                  approx.delete();
              }
          }

          let cardImage = null;
          if (cardContour) {
              let rect = cv.boundingRect(cardContour);
              let cardImg = src.roi(rect);

              // Create a new canvas to display the cropped card
              let cardCanvas = document.createElement('canvas');
              let cardContext = cardCanvas.getContext('2d');
              cardCanvas.width = rect.width;
              cardCanvas.height = rect.height;
              // document.body.appendChild(cardCanvas);
              cv.imshow(cardCanvas, cardImg);
              cardImage = cardCanvas.toDataURL("image/jpeg");
              cardImg.delete();
              cardContour.delete();
          }

          src.delete();
          gray.delete();
          edges.delete();
          contours.delete();
          hierarchy.delete();

          resolve([hasCard, cardImage]);
      };

      imgElement.onerror = function (err) {
          reject(err);
      };
  });
}