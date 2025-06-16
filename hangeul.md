# API Contract: `sendTyphoonAttack` Cloud Function

**Function Name:** `sendTyphoonAttack`

**Trigger:** HTTPS Callable Cloud Function

**Purpose:** Processes an attack initiated by a player in a Hangeul Typhoon duel. It validates the attack, updates the game state in Firestore if successful, and returns the outcome.

**Request Payload:**

```json
{
  "gameId": "string",
  "attackerPlayerId": "string",
  "targetPlayerId": "string",
  "attackWord": "string"
}
```

**Response Payload:**

*   **Success (Attack Hits a Vulnerable Block):**
    ```json
    {
      "status": "success",
      "message": "Attack successful. Target's block destroyed.",
      "attackerPlayerId": "string",
      "targetPlayerId": "string",
      "destroyedBlockWord": "string",
      "targetGroundRiseAmount": "number"
    }
    ```

*   **Failure (Attack Misses or Invalid):**
    ```json
    {
      "status": "failure",
      "reason": "string",
      "message": "Attack failed. Attacker penalized.",
      "attackerPlayerId": "string",
      "attackerPenaltyGroundRiseAmount": "number"
    }
    ```

# Mission Order: Backend Developer - `sendTyphoonAttack` Function

**Project:** Korean Party - L'Académie K-Mage
**Mini-Game:** Hangeul Typhoon
**Task:** Implement `sendTyphoonAttack` Cloud Function (BETA-MINIGAME-003-BACKEND)

**Objective:**
Develop, test, and deploy a serverless Cloud Function named `sendTyphoonAttack`.

**Core Responsibilities:**

1.  **Authentication & Authorization:**
    *   Ensure authenticated callers.
    *   Verify `attackerPlayerId` matches caller.
    *   Verify `gameId` and player participation.
2.  **Game State Retrieval (Firestore):**
    *   Fetch duel game state, especially opponent's blocks (text, vulnerability status/timestamp).
3.  **Attack Validation:**
    *   Verify `targetPlayerId` has a block matching `attackWord`.
    *   Confirm the block is "vulnerable".
4.  **Game State Update (Successful Attack - Firestore):**
    *   Mark block as destroyed.
    *   Calculate `targetGroundRiseAmount`.
    *   Update `targetPlayerId`'s ground level.
    *   Log and return success response.
5.  **Game State Update (Failed Attack - Firestore):**
    *   Calculate `attackerPenaltyGroundRiseAmount`.
    *   Update `attackerPlayerId`'s ground level.
    *   Log and return failure response (with `reason`).
6.  **Error Handling:**
    *   Implement robust error handling.

**Assumed Firestore Structure (Illustrative):**
\`\`\`
/games/{gameId}/
    players/
        {playerId1}/
            groundHeight: 0 // Amount risen
            blocks: [ { id: "block1", text: "한국", vulnerableAt: timestamp, isDestroyed: false }, ... ]
        {playerId2}/ ...
    status: "active"
\`\`\`

**"Definition of Done":**
*   Function deployed and callable.
*   Correctly validates attacks.
*   Accurately updates Firestore.
*   Returns API-compliant responses.
*   Secure and error-resilient.
```
