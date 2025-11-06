import os
import psycopg2
from dotenv import load_dotenv

# Skrypt zakłada, że plik .env znajduje się w katalogu nadrzędnym (`myVOD/backend/`)
# względem lokalizacji tego skryptu (`myVOD/backend/myVOD/`)
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

db_host = os.getenv('SUPABASE_DB_HOST')
db_port = os.getenv('SUPABASE_DB_PORT')
db_password = os.getenv('SUPABASE_DB_PASSWORD')
db_name = 'postgres'
db_user = 'postgres'

print("--- Skrypt testujący połączenie z bazą danych ---")
print("Próba połączenia z:")
print(f"Host:     {db_host}")
print(f"Port:     {db_port}")
print(f"Użytkownik: {db_user}")
print("-" * 40)

try:
    # Ustawiamy krótki timeout, aby nie czekać zbyt długo na błąd
    conn = psycopg2.connect(
        host=db_host,
        port=db_port,
        password=db_password,
        dbname=db_name,
        user=db_user,
        connect_timeout=10
    )
    print("✅ SUKCES: Połączenie z bazą danych zostało nawiązane pomyślnie!")
    conn.close()
    print("Połączenie zostało zamknięte.")
except psycopg2.OperationalError as e:
    print("❌ BŁĄD: Nie można połączyć się z bazą danych.")
    print("To jest ten sam błąd, który występuje w Django.")
    print("Potwierdza to, że problem leży w konfiguracji sieciowej lub firewallu, a nie w samym Django.")
    print(f"\nSzczegóły błędu: {e}")
except Exception as e:
    print(f"Wystąpił nieoczekiwany błąd: {e}")
