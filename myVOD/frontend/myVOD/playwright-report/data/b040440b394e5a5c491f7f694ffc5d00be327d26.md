# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Logowanie" [level=1] [ref=e6]
      - paragraph [ref=e7]: Zaloguj się do swojego konta MyVOD
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: Email
        - textbox "Email" [ref=e11]:
          - /placeholder: twoj@email.com
      - generic [ref=e12]:
        - text: Hasło
        - generic [ref=e13]:
          - textbox "••••••••" [ref=e14]
          - button "Pokaż hasło" [ref=e15] [cursor=pointer]:
            - img [ref=e16]
      - button "Zaloguj się" [ref=e19] [cursor=pointer]
      - paragraph [ref=e20]:
        - text: Nie masz konta?
        - link "Zarejestruj się" [ref=e21] [cursor=pointer]:
          - /url: /auth/register
  - region "Notifications alt+T"
```