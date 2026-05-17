// AI safety model — permission levels for finance operations

export enum PermissionLevel {
  READ   = 0,  // summarize, explain, detect anomalies
  DRAFT  = 1,  // suggest, draft notes, draft changes
  WRITE  = 2,  // categorize, create transaction — REQUIRES user approval
  FORBID = 3,  // pay bills, transfer money, trade, delete — always blocked
}
