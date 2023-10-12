import { Vector2, Vector3 } from "three";


// rectangular texture or image.
export const spherePointToUV = (dotCenter: Vector3): Vector2 => {
    // Create a new vector and give it a direction from the center of the sphere
    // to the center of the dot.
    const newVector = new Vector3(dotCenter.x,-dotCenter.y,dotCenter.z).normalize();

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

export function getSunLatitudeAndLongitude(dateTime: Date) {
  // Constants
  const daysInYear = 365.25;  // Account for leap years
  const june21stOffsetCancer = 172;  // June 21st for Tropic of Cancer
  const hoursInDay = 24;
  const degreesInCircle = 360;

  // Calculate the day of the year (DOY)
  const january1st = new Date(dateTime.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((dateTime.getTime() - january1st.getTime()) / (24 * 60 * 60 * 1000));

  // Calculate latitude based on both Tropic of Cancer and Tropic of Capricorn
  const latitudeCancer = 23.44;  // Tropic of Cancer
  const latitude = latitudeCancer * Math.cos(2 * Math.PI * (dayOfYear - june21stOffsetCancer) / daysInYear);

  const timeInHours = dateTime.getUTCHours() + dateTime.getUTCMinutes() / 60 + dateTime.getUTCSeconds() / 3600;

  // Calculate longitude based on the time of the day
  const longitude = (timeInHours - 12) * (degreesInCircle / hoursInDay) + 1;

 return { latitude, longitude };
}

export function latLonToXYZ(lat: number, lon: number, r: number) {
  const x = r * Math.cos(lat * Math.PI/180) * Math.cos(lon * Math.PI/180)
  const y = r * Math.cos(lat * Math.PI/180) * Math.sin(lon * Math.PI/180)
  const z = r * Math.sin(lat * Math.PI/180)

  return {x, y, z}
}