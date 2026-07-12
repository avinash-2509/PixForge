# Architectural Trade-Offs & Future Enhancements

Every software architecture involves balancing **simplicity of implementation** against **production robustness at scale**. 

This document highlights five key design choices in PixelForge Async that were made for speed and simplicity, explains why they are suboptimal for production, and provides a road map for upgrading them.

---

## 1. HTTP Short Polling vs. Real-Time Push (WebSockets/SSE)

* **Current Design**: The frontend polls `GET /api/images/:id` every 2 seconds until the status changes or the variant is found.
* **Why it's Suboptimal**:
  * **Network Overhead**: Every poll requires a full HTTP request-response cycle, including sending headers, cookie evaluation, and TLS handshakes, which drains server resources.
  * **Database Load**: If 10,000 users are waiting for images, MongoDB will receive 5,000 read queries *every second*, mostly returning "still processing."
  * **Latency**: If a job finishes in 0.1 seconds, the client might wait up to 1.9 seconds before the next poll cycle detects it.
* **Future Upgrade**:
  * Implement **Server-Sent Events (SSE)**.
  * When `worker.js` completes a job, it publishes a message to a **Redis Pub/Sub** channel. The Express server subscribes to Redis and instantly pushes a `completed` message to the client over a persistent connection.

---

## 2. JWT Storage in `localStorage`

* **Current Design**: The frontend stores the authentication token via `localStorage.setItem('token', data.token)`.
* **Why it's Suboptimal**:
  * **XSS Vulnerability**: Any JavaScript code running in the browser (including third-party scripts, analytics, or compromised npm packages) has read access to `localStorage`. A malicious script can easily steal the user's token.
* **Future Upgrade**:
  * Store JWTs in **HttpOnly, Secure, SameSite=Strict Cookies**.
  * The backend sets this cookie on successful login. Browsers append this cookie automatically with every request. JavaScript cannot read `HttpOnly` cookies, making token theft via XSS impossible.

---

## 3. Unbounded File Stream Uploads

* **Current Design**: `busboy` pipes the incoming multipart file stream directly to Cloudinary without strict size validation.
* **Why it's Suboptimal**:
  * **DoS (Denial of Service) Vector**: A user could upload a 5GB video file disguised as an image. Express will continue streaming the bytes to Cloudinary, wasting bandwidth, locking connections, and potentially triggering timeout errors.
* **Future Upgrade**:
  * Configure `busboy` limits:
    ```javascript
    const bb = busboy({ 
      headers: req.headers, 
      limits: { fileSize: 25 * 1024 * 1024 } // Strict 25MB limit
    });
    ```
  * Listen to the `limit` event on the file stream and abort the upload immediately if the limit is breached.

---

## 4. Vendor Lock-In via Direct Cloudinary URLs

* **Current Design**: The backend stores and returns absolute Cloudinary URLs (`https://res.cloudinary.com/...`), which the frontend downloads directly.
* **Why it's Suboptimal**:
  * **Migration Overhead**: If you decide to switch from Cloudinary to AWS S3 or Cloudflare R2, you must write a script to rewrite all database paths and update the frontend code.
  * **Lack of Control**: You cannot easily configure custom caching headers or block hotlinking (unauthorized embedding of your image URLs on other sites).
* **Future Upgrade**:
  * Store relative file keys in the database (e.g., `storageKey: "originals/image123.jpg"`).
  * Run static media behind a custom proxy domain (e.g., `https://images.pixelforge.com/`) managed by a CDN like Cloudflare, routing requests to the storage bucket dynamically.

---

## 5. No Dead Letter Queue (DLQ) in RabbitMQ

* **Current Design**: If `worker.js` fails to process an image (due to a database drop, Cloudinary timeout, etc.), it logs the error, marks the image as `failed` in Mongo, and acknowledges (deletes) the message from the queue.
* **Why it's Suboptimal**:
  * **No Self-Healing**: Transient errors (temporary network drops) immediately cause the job to fail permanently without a retry.
* **Future Upgrade**:
  * Configure a **Dead Letter Exchange (DLX)** in RabbitMQ.
  * If a job fails, the worker rejects the message (with `requeue: false`), routing it to a separate retry queue with a delay. The message is retried (up to 3 times) before being marked as permanently failed.

---

## 6. No Token Revocation (Stateless Logouts)

* **Current Design**: Clicking logout on the frontend simply deletes the JWT from `localStorage`. The server remains completely unaware of this.
* **Why it's Suboptimal**:
  * **Security Gap**: If a JWT is stolen by an attacker, it remains valid for its entire lifetime (`7d` in our controllers), even after the legitimate user logs out. The attacker can access endpoints and data until the token expires naturally.
* **Future Upgrade**:
  * Implement short-lived Access Tokens (e.g. 15 minutes) coupled with rotating **Refresh Tokens** stored in HttpOnly cookies.
  * Store blacklisted tokens in a fast cache like **Redis** with a Time-to-Live (TTL) matching the token's remaining validity duration when a user explicitly logs out.

---

## 7. No Schema Validation Middleware on Request Payloads

* **Current Design**: Controller logic manually parses and validates request variables (e.g. checking crop width/height bounds in `imageController.js` using inline `if` statements).
* **Why it's Suboptimal**:
  * **Code Bloat**: Mixing parameter sanitization inside business controller code causes bloat, makes handlers harder to test, and increases the chance of missing boundary checks.
* **Future Upgrade**:
  * Adopt a schema validation library like **Zod** or **Joi**.
  * Write schemas and validate incoming payloads using custom middleware, returning `400 Bad Request` automatically before hitting the controller:
    ```javascript
    const cropSchema = z.object({
      left: z.number().nonnegative(),
      top: z.number().nonnegative(),
      width: z.number().positive(),
      height: z.number().positive()
    });
    ```

---

## 8. Missing Password Strength Constraints & Brute Force Vulnerability

* **Current Design**: User registration only checks if `password` exists, allowing weak passwords like `"1"` or `"abc"`. Additionally, there is no rate-limiting on `/api/auth/login`.
* **Why it's Suboptimal**:
  * **Insecure Accounts**: Accounts are highly susceptible to dictionary/credential stuffing attacks.
  * **Brute-Force Vulnerability**: Attackers can run infinite automated attempts to guess user passwords without being blocked.
* **Future Upgrade**:
  * Enforce password strength rules (e.g., minimum 8 characters, requiring mixed case, numbers, and symbols).
  * Apply specific rate-limit rules on the login endpoint (`/api/auth/login`) using tools like `express-rate-limit` to restrict attempts to 5 requests per minute per IP address.
