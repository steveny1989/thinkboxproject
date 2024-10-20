const API_KEY = 'sk-hlkffvnubygbratltvgicdiyypehpnusglwivijlpsewykho';

export async function transcribeAudio(audioBlob) {
  console.log('Received audioBlob in transcribeAudio:', audioBlob);
  
  if (!audioBlob || !(audioBlob instanceof Blob)) {
    console.error('Invalid audioBlob:', audioBlob);
    throw new Error('Invalid audio data');
  }

  console.log('Audio blob size:', audioBlob.size, 'bytes');
  console.log('Audio blob type:', audioBlob.type);

  const form = new FormData();
  form.append("model", "FunAudioLLM/SenseVoiceSmall");
  form.append("file", audioBlob, "audio.wav");

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    },
    body: form
  };

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error in transcribeAudio:', error);
    throw error;
  }
}

export async function polishText(text) {
  console.log('Original text for polishing:', text);

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "deepseek-ai/DeepSeek-V2.5",
      messages: [
        {
          role: "system",
          content: "你是一个精确的文本润色专家。你的任务是轻微改善文本的流畅度，纠正错别字和语法错误，但要严格保持原文的意思和结构。不要添加新的内容或改变原意。"
        },
        {
          role: "user",
          content: `请按以下步骤处理这段文本：
1. 仔细阅读文本，理解其原意。
2. 纠正任何错别字或明显的语法错误。
3. 如果有需要，轻微调整措辞以提高流畅度，但不要改变原意。
4. 不要添加新的内容或解释。
5. 如果文本已经很好，无需更改，请原样返回。

文本：${text}`
        }
      ],
      stream: false,
      max_tokens: 2048,
      temperature: 0.3,
      top_p: 0.9,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      n: 1
    })
  };

  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Full API response:', JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      let content = data.choices[0].message.content.trim();
      console.log('Raw polished content:', content);
      
      // 如果内容与原文完全相同，或者内容明显不足，则返回原文
      if (content === text || content.length < text.length / 2) {
        console.log('No significant changes made, returning original text');
        return text;
      }
      
      return content;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    console.error('Error in polishText:', error);
    return text; // 如果出错，返回原始文本
  }
}