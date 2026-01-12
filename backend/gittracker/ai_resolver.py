import os
import logging
from typing import Optional
from gittracker.models import Conflict

logger = logging.getLogger('GitTracker-AI')

class AIResolver:
    """AI-powered conflict resolution"""
    
    def __init__(self, api_key: Optional[str] = None, provider: str = "heuristic"):
        self.api_key = api_key
        self.provider = provider
        
    def resolve(self, conflict: Conflict, repo_path: str) -> str:
        """
        Generate a resolution for the conflict.
        """
        # If API key is missing but provider is AI, fallback with error message
        if not self.api_key and self.provider != "heuristic":
            return self._resolve_with_gemini(conflict) if self.provider == 'gemini' else self._resolve_heuristic(conflict) + "\n# Error: AI Provider selected but no API Key configured."

        if self.provider == "openai":
            return self._resolve_with_openai(conflict)
        elif self.provider == "gemini":
            return self._resolve_with_gemini(conflict)
        else:
            return self._resolve_heuristic(conflict)

    def _get_prompt(self, conflict: Conflict) -> str:
        return f"""
You are an expert software developer resolving a git merge conflict.
The file is '{conflict.file}'.

Branch 1 (Current):
{conflict.content1}

Branch 2 (Incoming):
{conflict.content2}

Please provide the best merged version of this code. 
Do not explain. Return ONLY the code.
If you are unsure, try to combine both features if they don't conflict logic, otherwise prefer Branch 2 but keep important logic from Branch 1.
"""

    def _resolve_with_openai(self, conflict: Conflict) -> str:
        try:
            import openai
            client = openai.OpenAI(api_key=self.api_key)
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful coding assistant that resolves git conflicts. Return only the merged code."},
                    {"role": "user", "content": self._get_prompt(conflict)}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except ImportError:
            return self._resolve_heuristic(conflict) + "\n# Error: OpenAI library not installed. Please reinstall requirements."
        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return self._resolve_heuristic(conflict) + f"\n# Error calling OpenAI: {e}"

    def _resolve_with_gemini(self, conflict: Conflict) -> str:
        try:
            import google.generativeai as genai
            # Use provided key or hardcoded key as fallback (if implemented safely elsewhere, but here we expect config)
            # The user provided a key which we will inject if missing from config
            key_to_use = self.api_key
            
            genai.configure(api_key=key_to_use)
            
            # List models to debug availability
            try:
                available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
                logger.info(f"Available Gemini models: {available_models}")
                
                # Pick the first available compatible model if our hardcoded one fails
                model_name = 'gemini-pro'
                if model_name not in available_models and 'models/gemini-pro' not in available_models:
                     # Try to find a suitable fallback
                     flash_models = [m for m in available_models if 'flash' in m]
                     pro_models = [m for m in available_models if 'pro' in m]
                     if flash_models:
                         model_name = flash_models[0]
                     elif pro_models:
                         model_name = pro_models[0]
                     elif available_models:
                         model_name = available_models[0]
                         
                logger.info(f"Using Gemini model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(self._get_prompt(conflict))
                return response.text.strip()
            except Exception as e:
                logger.error(f"Gemini model list/init error: {e}")
                raise e
        except ImportError:
             return self._resolve_heuristic(conflict) + "\n# Error: google-generativeai library not installed. Please reinstall requirements."
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return self._resolve_heuristic(conflict) + f"\n# Error calling Gemini: {e}"
            
    def _resolve_heuristic(self, conflict: Conflict) -> str:
        content1 = conflict.content1
        content2 = conflict.content2
        
        # Basic subset check
        if content1.strip() and content1 in content2:
            return content2
        if content2.strip() and content2 in content1:
            return content1
            
        return (
            f"<<<<<<< {conflict.branch1} (Current)\n"
            f"{content1}\n"
            f"=======\n"
            f"{content2}\n"
            f">>>>>>> {conflict.branch2} (Incoming)\n"
            f"# Tip: Configure AI API Key in GitTracker settings for smart resolution."
        )
