const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function reproduce() {
    try {
        console.log("Starting Image Update Reproduction...");

        // 1. Create Question with 2 Images
        // We use dummy URLs to simulate existing Cloudinary URLs
        const img1 = "http://res.cloudinary.com/demo/image/upload/v1/sample1.jpg";
        const img2 = "http://res.cloudinary.com/demo/image/upload/v1/sample2.jpg";

        const createRes = await axios.post(`${API_URL}/questions`, {
            title: "Repro Image Bug",
            desc: "Desc",
            images: [img1, img2],
            status: "pending"
        });
        const qId = createRes.data._id;
        console.log(`Created Question ${qId} with ${createRes.data.images.length} images.`);

        // 2. Simulate User Deleting the second image
        // Frontend sends the NEW list (just img1)
        const updatePayload = {
            title: "Repro Image Bug - Updated",
            desc: "Desc Updated",
            images: [img1] // we removed img2
        };

        console.log("Updating with reduced image list:", updatePayload.images);

        const updateRes = await axios.put(`${API_URL}/questions/${qId}`, updatePayload);
        console.log(`Update Response Images Length: ${updateRes.data.images.length}`);

        // 3. Verify Persistence (Fetch again)
        const getRes = await axios.get(`${API_URL}/admin/questions/${qId}`);
        const currentImages = getRes.data.images;
        console.log("Re-fetched Images:", currentImages);

        if (currentImages.length === 1 && currentImages[0] === img1) {
            console.log("✅ SUCCESS: Image was correctly removed.");
        } else {
            console.error("❌ FAIL: Image persisted or Update failed.");
            console.error("Expected 1 image, got:", currentImages.length);
        }

        // Cleanup
        await axios.delete(`${API_URL}/admin/questions/${qId}`);

    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) console.error(e.response.data);
    }
}

reproduce();
