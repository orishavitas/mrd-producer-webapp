# **Product Specification: AI One-Pager Generator**

## **1\. Project Overview**

A web application that guides users through a 7-step wizard to generate a comprehensive product "One Pager." The app features text expansion, dynamic lists, and AI-powered competitor analysis.

## **2\. Tech Stack Requirements**

* **Frontend:** React (functional components, hooks).  
* **Styling:** Tailwind CSS (clean, modern UI).  
* **State Management:** React Context or local state to hold the "One Pager" data object.  
* **AI Integration:** Placeholder functions for LLM calls (OpenAI/Anthropic) for text expansion and URL scraping.

  ## **3\. Detailed UI & Logic Flow (7 Steps)**

  ### **Step 1: Product Description**

* **Input:** Free text area.  
* **AI Feature:** "Suggest Expansion" button.  
  * *Logic:* Takes the user's brief input and expands it into a professional description.  
* **Output:** Populates as a full paragraph.

  ### **Step 2: Goal**

* **Input:** Free text area.  
* **AI Feature:** "Suggest Expansion" button.  
* **Output:** Populates as a full paragraph.

  ### **Step 3: Where (Environment & Industry)**

* **UI:** Checkbox groups.  
* **Structure:** Data must be predefined (hardcoded list) but visually divided into two sections:  
  1. **Environment** (e.g., Indoor, Outdoor, Cloud, On-prem).  
  2. **Industry** (e.g., Retail, Tech, Healthcare).  
* **Interaction:** User can select multiple options from both sections.

  ### **Step 4: Who (Target Audience)**

* **Dependency:** This section loads/populates *after* Step 3 is completed.  
* **UI:** Checkboxes.  
* **Data Source:** Predefined list based on files/config.  
* **User Action:** "Add New" feature. User can create a custom checkbox if their audience isn't listed.

  ### **Step 5: Features (Must-Have vs. Nice-to-Have)**

* **UI Structure:** Two distinct input areas or a toggle to categorize features into:  
  * **Must Have**  
  * **Nice to Have**  
* **Input Method:**  
  * User types text.  
  * Input is delimited by commas OR by hitting "Enter" to create UI "Chips".  
* **Output:** Renders as a formatted bulleted list in the final view.

  ### **Step 6: Commercials (MOQ & Price)**

* **Input 1:** MOQ (Minimum Order Quantity) \- Numeric/Text.  
* **Input 2:** Target Price Range \- Free text.

  ### **Step 7: Competitors (AI Powered)**

* **Input:** URL Input field.  
* **Action:** "Analyze" button.  
* **AI Logic (Scraping/Processing):**  
  * Input: User provided URL.  
  * Process: Fetch site content \-\> AI extraction.  
  * Output Fields: Product Name, Brand, Price, Product Description, Images.  
* **Secondary Feature:** "AI Research" option (to find competitors if the user doesn't have a URL).

  ## **4\. Data Structure (State Schema)**

```
{
  "description": "Expanded paragraph string",
  "goal": "Expanded paragraph string",
  "context": {
    "environments": ["selected_id_1"],
    "industries": ["selected_id_2"]
  },
  "audience": {
    "predefined": ["selected_id"],
    "custom": ["user_added_string"]
  },
  "features": {
    "mustHave": ["feature1", "feature2"],
    "niceToHave": ["feature3", "feature4"]
  },
  "commercials": {
    "moq": "string or number",
    "targetPrice": "string"
  },
  "competitors": [
    {
      "url": "[https://example.com](https://example.com)",
      "brand": "BrandName",
      "productName": "Item",
      "price": "$100",
      "description": "AI generated summary",
      "imageUrl": "..."
    }
  ]
}
```

  ## **5\. Implementation Roadmap**

1. **Scaffold Form:** Create the layout with a stepper or vertical scroll flow.  
2. **Build Static Inputs:** Implement Steps 1, 2, 3, 6\.  
3. **Implement Dynamic Logic:** Build Step 4 (Add custom checkbox) and Step 5 (Chip input system).  
4. **Integrate Mock AI:**  
   * Create a fake `expandText(text)` function that returns a longer version of the string after a 1s delay.  
   * Create a fake `analyzeUrl(url)` function that returns dummy competitor JSON data.  
* 

