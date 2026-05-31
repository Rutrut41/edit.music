const HF_API_TOKEN = process.env.HF_API_TOKEN

// Detect if a string contains non-Latin characters
function hasNonLatinScript(text: string): boolean {
  // Latin blocks: Basic Latin, Latin Extended, Latin Extended-A/B
  const latinRegex = /^[ -ɏ\s\-&\/,;|]*$/
  return !latinRegex.test(text)
}

interface TranslationResult {
  original: string
  hasNonLatin: boolean
  translated?: string
  error?: string
}

async function translateGenres(genres: string[]): Promise<TranslationResult[]> {
  if (!HF_API_TOKEN) {
    return genres.map(g => ({
      original: g,
      hasNonLatin: hasNonLatinScript(g),
      error: 'HF_API_TOKEN not set'
    }))
  }

  const results: TranslationResult[] = []

  for (const genre of genres) {
    const hasNonLatin = hasNonLatinScript(genre)

    if (!hasNonLatin) {
      results.push({
        original: genre,
        hasNonLatin: false
      })
      continue
    }

    try {
      const response = await fetch(
        'https://api-inference.huggingface.co/models/facebook/m2m100_418M',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: genre,
            parameters: { src_lang: 'auto', tgt_lang: 'en' }
          })
        }
      )

      if (!response.ok) {
        throw new Error(`HF API error: ${response.statusText}`)
      }

      const data = await response.json() as any
      const translated = data?.[0]?.translation_text || genre

      results.push({
        original: genre,
        hasNonLatin: true,
        translated
      })
    } catch (e: any) {
      results.push({
        original: genre,
        hasNonLatin: true,
        error: e.message
      })
    }
  }

  return results
}

export { translateGenres, hasNonLatinScript, TranslationResult }
