// src/types/guild.ts

export type GuildMemberRole = "master" | "officer" | "member"; // Add more roles as needed

export interface GuildMember {
  uid: string;
  displayName?: string; // Optional: denormalized for easier display
  role: GuildMemberRole;
  // joinedAt?: Timestamp; // Optional
}

// This interface represents the data structure as expected from Firestore
// and as needed by the frontend components.
export interface Guild {
  id: string;                 // Document ID
  name: string;               // Name of the House, ex: "Les Dragons de Sejong"
  tag: string;                // Short tag, ex: "DRGN"
  description: string;        // Guild description
  emblem: string;             // ID or URL for the guild emblem
  masterId: string;           // UID of the creator/master
  memberCount: number;        // Total number of members

  // In Firestore, this is a map: { [uid: string]: { role: GuildMemberRole, displayName?: string } }
  // For frontend ease, we might transform it into an array of GuildMember objects when fetching.
  // Or, the component can handle the map directly. Let's use an array for component simplicity for now.
  members: GuildMember[];     // Detailed list of members

  // Optional: For guild list display, we might not always fetch all members.
  // membersMap?: { [uid: string]: { role: GuildMemberRole, displayName?: string } };
}

// Interface for data used when creating a guild
export interface CreateGuildData {
  name: string;
  tag: string;
  description: string;
  emblem: string; // Initially, could be a selection ID, backend resolves to URL
}

// Interface for data returned by listGuilds (summary for directory)
export interface ListedGuild extends Pick<Guild, 'id' | 'name' | 'tag' | 'memberCount' | 'description' | 'emblem'> {
  // any other summary-specific fields
}
