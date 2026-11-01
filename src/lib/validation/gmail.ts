export function isValidGmailAddress(value: string | null | undefined): boolean {
 const match = /^([a-z0-9.]+)@gmail\.com$/.exec((value ?? "").trim().toLowerCase());
 if (!match) return false;
 const username = match[1];
 return username.length >= 6 && username.length <= 30 && !username.startsWith(".") && !username.endsWith(".") && !username.includes("..");
}
export function gmailUsername(value: string): string { return value.replace(/@gmail\.com$/i, ""); }
export function gmailAddressFromInput(value: string): string {
 const username = value.trim();
 return username.includes("@") ? username : username ? username + "@gmail.com" : "";
}
