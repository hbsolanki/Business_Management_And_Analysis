
def get_groq_response(user_prompt: str, model: str = "llama-3.3-70b-versatile"):
    try:
        chat_completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful AI assistant."},
                {"role": "user", "content": user_prompt}
            ]
        )

        # Extract and return the content
        return chat_completion.choices[0].message.content

    except Exception as e:
        return f"Error: {e}"
