export interface HangeulTyphoonAttackSuccessResponse {
  status: "success";
  message: string;
  attackerPlayerId: string;
  targetPlayerId: string;
  destroyedBlockWord: string;
  targetGroundRiseAmount: number;
}

export interface HangeulTyphoonAttackFailureResponse {
  status: "failure";
  reason: string; // e.g., "NO_VULNERABLE_BLOCK_MATCHED", "INVALID_WORD", "BLOCK_NOT_FOUND", "FUNCTION_CALL_ERROR"
  message: string;
  attackerPlayerId: string;
  attackerPenaltyGroundRiseAmount: number;
}

export type HangeulTyphoonAttackResponse = HangeulTyphoonAttackSuccessResponse | HangeulTyphoonAttackFailureResponse;
