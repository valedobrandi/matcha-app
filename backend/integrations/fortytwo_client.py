import httpx

class FortyTwoClientException(Exception):
    pass

class FortyTwoClient:
    """
    OAuth2 Client for interacting with 42 (fortytwo) API.
    Handles code exchange and profile fetch.
    """

    BASE_URL = "https://api.intra.42.fr"

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri


    async def authenticate(self, code:str) -> dict:
        """
        Exchanges the OAuth code for an access token and fetches the user's profile.
        """
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                f"{self.BASE_URL}/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": self.redirect_uri,
                },
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            if not access_token:
                raise FortyTwoClientException("missing access token")

            profile_response = await client.get(
                f"{self.BASE_URL}/v2/me",
                headers={
                    "Authorization": f"Bearer {access_token}"
                }
            )
            profile_response.raise_for_status()
            return profile_response.json()
    