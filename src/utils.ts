import { Vector2, Vector3 } from "three";


// rectangular texture or image.
export const spherePointToUV = (dotCenter: Vector3): Vector2 => {
    // Create a new vector and give it a direction from the center of the sphere
    // to the center of the dot.
    const newVector = new Vector3(-dotCenter.x,-dotCenter.y,-dotCenter.z).normalize();

    // Calculate the  UV coordinates of the dot and return them as a vector.
    const uvX = 1 - (0.5 + Math.atan2(newVector.z, newVector.x) / (2 * Math.PI));
    const uvY = 0.5 + Math.asin(newVector.y) / Math.PI;

    return new Vector2(uvX, uvY);
  };

// Utility function to sample the data of an image at a given point. Requires
// an imageData object.
export const sampleImage = (imageData: ImageData, uv: Vector2) => {
    // Calculate and return the data for the point, from the UV coordinates.
    const point = 
      4 * Math.floor(uv.x * imageData.width) +
      Math.floor(uv.y * imageData.height) * (4 * imageData.width);

    return imageData.data.slice(point, point + 4);
  };