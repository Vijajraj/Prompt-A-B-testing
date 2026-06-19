import streamlit as st
import requests
import pandas as pd
import os
from dotenv import load_dotenv, find_dotenv

# Load environment variables
load_dotenv(find_dotenv())

# FastAPI Backend URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Page Configuration
st.set_page_config(
    page_title="Prompt A/B Testing Dashboard",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom Premium Styling
st.markdown("""
<style>
    .main {
        background-color: #0e1117;
        color: #ffffff;
    }
    .stTextArea textarea {
        background-color: #1e222b;
        color: #ffffff;
        border: 1px solid #30363d;
        border-radius: 6px;
    }
    .winner-card {
        border: 2px solid #ffd700 !important;
        background-color: rgba(255, 215, 0, 0.05);
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
    }
    .variant-card {
        border: 1px solid #30363d;
        background-color: #161b22;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 10px;
    }
    .score-badge-winner {
        background-color: #ffd700;
        color: #0e1117;
        font-weight: bold;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.9em;
    }
    .score-badge {
        background-color: #30363d;
        color: #ffffff;
        font-weight: bold;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.9em;
    }
</style>
""", unsafe_allow_html=True)

st.title("⚡ Prompt A/B Testing Dashboard")
st.markdown("Experiment with system prompts, evaluate with an LLM judge, and automatically run the winner on Llama 3.3 70B.")

# Initialize session state for caching run results
if "run_result" not in st.session_state:
    st.session_state.run_result = None
if "final_output" not in st.session_state:
    st.session_state.final_output = None
if "error" not in st.session_state:
    st.session_state.error = None

# Input Form
with st.container():
    # Prompt A and Prompt B in a row
    col1, col2 = st.columns(2)
    with col1:
        prompt_a = st.text_area(
            "Prompt A (System Prompt Variant 1)",
            value="Summarize formally in 2-3 sentences",
            height=100
        )
    with col2:
        prompt_b = st.text_area(
            "Prompt B (System Prompt Variant 2)",
            value="Summarize as 3-5 bullet points",
            height=100
        )

    # Prompt C and Query in a row
    col3, col4 = st.columns(2)
    with col3:
        prompt_c = st.text_area(
            "Prompt C (System Prompt Variant 3)",
            value="Summarize in simple everyday language",
            height=100
        )
    with col4:
        query = st.text_area(
            "Your Query / User Message",
            value="Artificial Intelligence (AI) is intelligence demonstrated by machines, as opposed to intelligence of humans and other animals. Example tasks in which this is done include speech recognition, computer vision, translation between (natural) languages, as well as other mappings of inputs.",
            height=100
        )

    # Model selection settings
    st.markdown("### Settings")
    col_sel, _ = st.columns([1, 1])
    with col_sel:
        model_options = {
            "Auto-Select Free Model (OpenRouter)": "openrouter/free",
            "Llama 3.3 70B (Free)": "meta-llama/llama-3.3-70b-instruct:free",
            "Gemma 4 31B (Free)": "google/gemma-4-31b-it:free",
            "GPT OSS 120B (Free)": "openai/gpt-oss-120b:free",
            "Qwen 3 Coder (Free)": "qwen/qwen3-coder:free",
            "Llama 3.2 3B (Free)": "meta-llama/llama-3.2-3b-instruct:free"
        }
        selected_model_label = st.selectbox(
            "Select Promotion Model (OpenRouter)",
            options=list(model_options.keys()),
            index=0
        )
        selected_model = model_options[selected_model_label]

    # Run Button
    run_clicked = st.button("▶ Run All Prompts", type="primary", use_container_width=True)

if run_clicked:
    # Clear previous runs
    st.session_state.run_result = None
    st.session_state.final_output = None
    st.session_state.error = None

    # Step 1: Run A/B evaluation via FastAPI
    with st.spinner("Step 1/2: Testing prompt variants on Groq & scoring with judge LLM..."):
        try:
            payload = {
                "prompt_a": prompt_a,
                "prompt_b": prompt_b,
                "prompt_c": prompt_c,
                "query": query
            }
            res = requests.post(f"{BACKEND_URL}/api/run", json=payload)
            if res.status_code == 200:
                st.session_state.run_result = res.json()
            else:
                st.session_state.error = f"FastAPI run error: {res.text}"
        except Exception as e:
            st.session_state.error = f"Connection to backend failed: {str(e)}"

    # Step 2: Promote the winner to OpenRouter
    if st.session_state.run_result and not st.session_state.error:
        winning_variant = st.session_state.run_result["winner"]
        winning_prompt = st.session_state.run_result["winning_prompt"]
        log_id = st.session_state.run_result["log_id"]

        with st.spinner(f"Step 2/2: Promoting Variant {winning_variant} using {selected_model_label}..."):
            try:
                promote_payload = {
                    "log_id": log_id,
                    "winning_prompt": winning_prompt,
                    "query": query,
                    "model": selected_model
                }
                promote_res = requests.post(f"{BACKEND_URL}/api/promote", json=promote_payload)
                if promote_res.status_code == 200:
                    st.session_state.final_output = promote_res.json()
                else:
                    st.session_state.error = f"FastAPI promote error: {promote_res.text}"
            except Exception as e:
                st.session_state.error = f"Promoting winner failed: {str(e)}"

# Error Display
if st.session_state.error:
    st.error(st.session_state.error)

# Results Display
if st.session_state.run_result:
    st.markdown("---")
    st.subheader("Results")
    
    results = st.session_state.run_result["results"]
    winner = st.session_state.run_result["winner"]

    # Show 3 variants side-by-side
    cols = st.columns(3)
    for idx, r in enumerate(results):
        variant = r["variant"]
        is_winner = (variant == winner)
        card_class = "winner-card" if is_winner else "variant-card"
        badge_class = "score-badge-winner" if is_winner else "score-badge"
        winner_trophy = " 🏆" if is_winner else ""

        with cols[idx]:
            st.markdown(
                f"""
                <div class="{card_class}">
                    <h3>Prompt {variant}{winner_trophy}</h3>
                    <p><b>Prompt:</b> <i>"{r['prompt']}"</i></p>
                    <hr style="border: 0.5px solid #30363d; margin: 8px 0;"/>
                    <p><b>Response:</b></p>
                    <p>{r['response']}</p>
                    <hr style="border: 0.5px solid #30363d; margin: 8px 0;"/>
                    <div>
                        <span class="{badge_class}">Score: {r['score']}/10</span>
                    </div>
                    <p style="margin-top: 8px; font-size: 0.9em; color: #8b949e;"><b>Judge Reason:</b> {r['reason']}</p>
                </div>
                """,
                unsafe_allow_html=True
            )

# Promoted Output Display
if st.session_state.final_output:
    st.markdown("---")
    winner = st.session_state.run_result["winner"]
    st.subheader(f"🏆 Winner: Prompt {winner} → sent to Llama 3.3 70B via OpenRouter")
    
    with st.container():
        st.markdown(
            f"""
            <div style="background-color: #161b22; border: 1px solid #ffd700; border-radius: 8px; padding: 20px;">
                <p style="color: #ffd700; font-size: 0.85em; margin-bottom: 10px;">Model: {st.session_state.final_output['model']}</p>
                <div style="white-space: pre-wrap; font-size: 1.1em; color: #ffffff;">{st.session_state.final_output['final_output']}</div>
            </div>
            """,
            unsafe_allow_html=True
        )

# Run History section (Collapsible)
st.markdown("---")
with st.expander("📊 Run History", expanded=False):
    st.markdown("Recent runs loaded directly from Supabase:")
    
    # Load history on demand when expander is opened
    try:
        history_res = requests.get(f"{BACKEND_URL}/api/logs")
        if history_res.status_code == 200:
            logs = history_res.json()
            if logs:
                df = pd.DataFrame(logs)
                # Select and reorder columns for display
                df_display = df[[
                    "created_at", "query", "prompt_a", "prompt_b", "prompt_c", 
                    "score_a", "score_b", "score_c", "winner", "final_output"
                ]].copy()
                
                # Format timestamps
                df_display["created_at"] = pd.to_datetime(df_display["created_at"]).dt.strftime('%Y-%m-%d %H:%M:%S')
                
                # Rename columns
                df_display.columns = [
                    "Timestamp", "Query", "Prompt A", "Prompt B", "Prompt C", 
                    "Score A", "Score B", "Score C", "Winner", "Final Llama Output"
                ]
                
                st.dataframe(df_display, use_container_width=True)
            else:
                st.info("No run logs found in Supabase yet. Run an experiment above!")
        else:
            st.error(f"Failed to load history: {history_res.text}")
    except Exception as e:
        st.error(f"Could not connect to backend to fetch logs: {str(e)}")
