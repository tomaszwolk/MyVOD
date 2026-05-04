import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getPlatforms } from "@/lib/api/platforms";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function AvailabilitySyncSection() {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("__all__");
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string>("");
  const { accessToken } = useAuth();

  const { data: platforms = [] } = useQuery({
    queryKey: ["platforms"],
    queryFn: getPlatforms,
  });

  const handleSync = async () => {
    setIsLoading(true);
    setLogs("");

    if (!accessToken) {
      toast.error("Błąd autoryzacji", {
        description: "Nie znaleziono tokenu API. Zaloguj się ponownie.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/tasks/trigger-availability-sync/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ platform_slug: selectedPlatform }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Could not read response body.");
      }

      const decoder = new TextDecoder();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        setLogs((prev) => prev + decoder.decode(value, { stream: true }));
      }

      toast.success("Synchronizacja zakończona", {
        description: "Proces synchronizacji dostępności został zakończony.",
      });
    } catch (error) {
      console.error("Synchronization error:", error);
      toast.error("Błąd synchronizacji", {
        description:
          "Wystąpił błąd podczas synchronizacji. Sprawdź konsolę deweloperską.",
      });
      setLogs(
        (prev) =>
          `${prev}\n\nBŁĄD: Proces został przerwany. Sprawdź logi backendu.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Synchronizacja Dostępności VOD</CardTitle>
        <CardDescription>
          Uruchom ręczną synchronizację dostępności filmów dla wybranej
          platformy lub wszystkich naraz. Ten proces może potrwać kilka minut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Select
            value={selectedPlatform}
            onValueChange={setSelectedPlatform}
            disabled={isLoading}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Wybierz platformę" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Wszystkie Platformy</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.platform_slug}>
                  {p.platform_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSync} disabled={isLoading}>
            {isLoading ? "Synchronizowanie..." : "Uruchom Synchronizację"}
          </Button>
        </div>
        {logs && (
          <div className="mt-4 rounded-md bg-muted p-4">
            <h4 className="mb-2 font-semibold">Logi synchronizacji:</h4>
            <pre className="h-64 overflow-y-auto whitespace-pre-wrap text-sm">
              {logs}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
