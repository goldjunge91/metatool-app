"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";

import { getMcpServers } from "@/app/actions/mcp-servers"; // Import server action
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfiles } from "@/hooks/use-profiles";
import { useConnection } from "@/hooks/useConnection";
import { useConnectionMulti } from "@/hooks/useConnectionMulti";
import { ConnectionStatus } from "@/lib/constants";
import { McpServer } from "@/types/mcp-server";

export default function ConnectionStatusPage() {
  const { currentProfile } = useProfiles();
  const currentProfileUuid = currentProfile?.uuid;

  const [selectedServerUuid, setSelectedServerUuid] = useState<string | undefined>(undefined);

  const { data: availableServers, isLoading: isLoadingServers } = useSWR<McpServer[]>(
    currentProfileUuid ? `${currentProfileUuid}/mcp-servers` : null,
    () => (currentProfileUuid ? getMcpServers(currentProfileUuid) : Promise.resolve([]))
  );

  // Call useConnection unconditionally
  const singleConnectionHookData = useConnection({
    // Pass an empty string if no server/profile is selected; the hook should handle this gracefully
    // (e.g., by not attempting to connect or returning a default 'disconnected' state)
    mcpServerUuid: selectedServerUuid || "",
    currentProfileUuid: currentProfileUuid || "",
  });

  useEffect(() => {
    if (availableServers && selectedServerUuid && !availableServers.find(s => s.uuid === selectedServerUuid)) {
      setSelectedServerUuid(undefined);
    }
  }, [availableServers, selectedServerUuid, currentProfileUuid]);

  let singleConnectionStatus: ConnectionStatus = 'disconnected';

  // Only use the hook's data if a server and profile are actually selected
  if (selectedServerUuid && currentProfileUuid && singleConnectionHookData) {
    singleConnectionStatus = singleConnectionHookData.connectionStatus;
  }

  const { connectionStatuses: multiConnectionStatuses, activeConnections } = useConnectionMulti();

  const displayMcpServerUuid = selectedServerUuid;
  const selectedServerName = availableServers?.find(s => s.uuid === selectedServerUuid)?.name || displayMcpServerUuid;

  const isSingleConnectionRelevant = displayMcpServerUuid && currentProfileUuid;
  // const isSingleConnectionHookActive = isSingleConnectionRelevant && singleConnectionHookData && singleConnectionStatus !== 'disconnected'; // Removed as it's unused

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Connection Status</h1>

      {/* Server Selection Dropdown */}
      <div className="mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isLoadingServers || !currentProfileUuid}>
              {selectedServerUuid && availableServers && availableServers.find(s => s.uuid === selectedServerUuid)
                ? availableServers.find(s => s.uuid === selectedServerUuid)?.name || "Select Server"
                : "Select Server"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {isLoadingServers && <DropdownMenuItem disabled>Loading servers...</DropdownMenuItem>}
            {!isLoadingServers && !availableServers?.length && <DropdownMenuItem disabled>No servers available for this profile.</DropdownMenuItem>}
            {availableServers?.map((server) => (
              <DropdownMenuItem
                key={server.uuid}
                onSelect={() => setSelectedServerUuid(server.uuid)}
              >
                {server.name} ({server.uuid.substring(0, 8)})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {!currentProfileUuid && <p className="text-sm text-muted-foreground mt-1">Please select a profile first.</p>}
      </div>

      {/* Abschnitt für den Einzelverbindungsstatus */}
      {isSingleConnectionRelevant ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Single Connection Status: {selectedServerName || 'N/A'}</CardTitle>
          </CardHeader>
          <CardContent>
            {singleConnectionHookData && singleConnectionStatus ? (
              <p>
                Server UUID: {displayMcpServerUuid} (Profile: {currentProfileUuid}) - Status:{" "}
                <Badge
                  variant={
                    singleConnectionStatus === "connected"
                      ? "default"
                      : singleConnectionStatus === "connecting"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {singleConnectionStatus}
                </Badge>
              </p>
            ) : (
              <p>
                Connecting to server {selectedServerName || displayMcpServerUuid} with profile {currentProfileUuid}...
                If this message persists, the server may be unavailable or the profile invalid.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Single Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please select a server and ensure a profile is active to view single connection status.</p>
            {!currentProfileUuid && <p className="text-sm text-muted-foreground">No active profile selected.</p>}
            {currentProfileUuid && !displayMcpServerUuid && <p className="text-sm text-muted-foreground">No server selected for single view.</p>}
          </CardContent>
        </Card>
      )}

      {/* Abschnitt für den Multi-Verbindungsstatus */}
      {Object.keys(multiConnectionStatuses).length > 0 || !isSingleConnectionRelevant ? (
         <Card>
          <CardHeader>
            <CardTitle>Multi-Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(multiConnectionStatuses).length > 0 ? (
              <ul>
                {Object.entries(multiConnectionStatuses).map(
                  ([uuid, status]) => {
                    const serverName = availableServers?.find(s => s.uuid === uuid)?.name || uuid;
                    return (
                      <li key={uuid} className="mb-2">
                        Server: {serverName} ({uuid.substring(0,8)}) - Status:{" "}
                        <Badge
                          variant={
                            status === "connected"
                              ? "default"
                              : status === "connecting"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {status}
                        </Badge>
                         (Active: {activeConnections[uuid] ? "Yes" : "No"})
                      </li>
                    );
                  }
                )}
              </ul>
            ) : (
              <p>No active multi-connections.</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Fallback-Nachricht, wenn gar keine Verbindungsdaten vorhanden sind */}
      {!isSingleConnectionRelevant && Object.keys(multiConnectionStatuses).length === 0 && (
        <p>No connection information available. Please select a server and ensure a profile is active.</p>
      )}
    </div>
  );
}
