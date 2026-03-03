import app from "./app.js";

const port = process.env.PORT || 5050;

app.listen(port, () => console.log(`Server running on ${port}`));
