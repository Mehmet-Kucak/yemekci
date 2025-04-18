// pages/api/getCity.js
import fs from 'fs';
import path from 'path';
import { point } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

export default function handler(req, res) {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    // Load the GeoJSON file
    const geoJsonPath = path.join(process.cwd(), 'public', 'YemekciGeoJSON.geojson');
    if (!fs.existsSync(geoJsonPath)) {
      console.error('GeoJSON file not found at:', geoJsonPath);
      return res.status(500).json({ error: 'GeoJSON file not found' });
    }
    const geoJsonContents = fs.readFileSync(geoJsonPath, 'utf8');
    let geojson;
    try {
      geojson = JSON.parse(geoJsonContents);
    } catch (err) {
      console.error('Error parsing GeoJSON file:', err);
      return res.status(500).json({ error: 'Error parsing GeoJSON file' });
    }

    // Load the properties JSON file
    const propertiesJsonPath = path.join(process.cwd(), 'public', 'TurkeyProvinces.json');
    if (!fs.existsSync(propertiesJsonPath)) {
      console.error('Properties JSON file not found at:', propertiesJsonPath);
      return res.status(500).json({ error: 'Properties JSON file not found' });
    }
    const propertiesJsonContents = fs.readFileSync(propertiesJsonPath, 'utf8');
    let propertiesJson;
    try {
      propertiesJson = JSON.parse(propertiesJsonContents);
    } catch (err) {
      console.error('Error parsing Properties JSON file:', err);
      return res.status(500).json({ error: 'Error parsing Properties JSON file' });
    }

    const userLocation = point([longitude, latitude]);

    let foundProvince = null;
    for (const feature of geojson.features) {
      if (booleanPointInPolygon(userLocation, feature)) {
        foundProvince = feature.properties.name; // Adjust based on your GeoJSON property naming
        break;
      }
    }

    if (foundProvince) {
      const provinceInfo = propertiesJson.find(province => province.name === foundProvince);
      if (provinceInfo && provinceInfo.id) {
        const formattedId = String(provinceInfo.id).padStart(2, '0');
        res.status(200).json({ province: foundProvince, id: formattedId, region: provinceInfo.region});
      } else {
        res.status(404).json({ error: 'Province ID not found' });
      }
    } else {
      res.status(404).json({ error: 'Province not found' });
    }
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
