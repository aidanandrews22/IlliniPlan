# **Web App Styling Guide**

## **1. General Design Philosophy**
- **Objective:** Deliver the best **planning experience** for students, helping them create effective and intuitive course plans.
- Prioritize **desktop-first design** with responsive layouts that adapt beautifully to mobile devices.
- Maintain a **clean, simple, and elegant design** inspired by Apple’s aesthetic, ensuring the interface never detracts from the app’s functionality and intelligence.
- Focus on **intuitive navigation**, **user-centered interactions**, and **subtle yet meaningful visual enhancements**.
- Leverage **Tailwind CSS** for utility-first styling, ensuring design consistency across components.

---

## **2. Typography**
- **Font:** Use Apple’s **San Francisco (SF)** font (or fallback to system-ui) for a polished, professional look.
  - **Headlines:** Bold, large, and clear to guide attention without overwhelming.
  - **Body Text:** Highly legible, with moderate contrast for ease of reading during long planning sessions.
  - **Secondary Text:** Subtle and unobtrusive for auxiliary information.
- **Dynamic Text Scaling:** Support user preferences for accessibility.
- Tailwind Typography Utilities:
  - Headlines: `text-2xl lg:text-4xl font-bold leading-tight`
  - Body Text: `text-base lg:text-lg font-normal`
  - Secondary Text: `text-sm lg:text-base text-gray-500`

---

## **3. Layout and Spacing**
- **Goal:** Ensure layouts feel intuitive and support decision-making by organizing information hierarchically.
- **Grid System:** Use a flexible grid for desktop (`grid grid-cols-3 gap-6`), gracefully collapsing into stacked layouts on mobile (`flex flex-col`).
- **Whitespace:** Incorporate generous whitespace for clarity and focus, reducing cognitive load.
- **Hierarchy:**
  - **Primary Content:** Front and center, visually dominant with bold headlines.
  - **Secondary Actions:** Smaller and placed subtly to avoid distractions.
- Tailwind Layout Classes:
  - Margins/Padding: `p-6 lg:p-12`, `m-4 lg:m-8`
  - Grid Layout: `grid grid-cols-3 lg:grid-cols-5 gap-4`

---

## **4. Colors**

### **Light Mode**
- **Backgrounds:** Neutral tones like soft white (`bg-white`) or muted gray (`bg-gray-100`) to keep the focus on content.
- **Text:**
  - **Primary:** High-contrast black (`text-gray-900`) for clarity.
  - **Secondary:** Dimmed gray (`text-gray-600`) for supporting text.
- **Accent Color:** A single, vibrant color for interactive elements (`text-blue-500`, `hover:text-blue-600`) to guide actions.

### **Dark Mode**
- **Backgrounds:** Deep grays (`bg-gray-900`) or black (`bg-black`) to reduce eye strain during late-night sessions.
- **Text:**
  - **Primary:** Light grays (`text-gray-100`) for readability.
  - **Secondary:** Subtle grays (`text-gray-400`) for lesser information.
- **Accent Color:** Adjusted to maintain vibrancy in dark mode (`text-blue-400`, `hover:text-blue-500`).
- Tailwind Utilities:
  - Light Mode: `bg-gray-100 text-gray-900`
  - Dark Mode: `dark:bg-gray-900 dark:text-gray-100`

---

## **5. Buttons and Interactions**
- **Purpose:** Buttons should subtly complement the functionality, providing clarity without drawing unnecessary attention.
- **Desktop Buttons:**
  - Rounded, modern styling (`rounded-lg`) with hover effects (`hover:bg-blue-500`, `hover:opacity-90`).
- **Mobile Tappable Areas:** Minimum 44x44px for accessibility.
- **Feedback:** Offer **visual (opacity)** and **haptic (optional)** feedback for interactions.
- Tailwind Examples:
  - Primary Action: `bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600`
  - Secondary Action: `bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300`

---

## **6. Iconography**
- **Goal:** Enhance usability without cluttering the interface.
- Use clean, modern icons (e.g., **Heroicons** or **Lucide**) to denote actions and categories.
- Maintain consistent sizes and visual weights for cohesion.
- Label icons where necessary for accessibility.
- Tailwind Utilities:
  - Icon Size: `h-6 w-6 lg:h-8 lg:w-8`
  - Colors: `text-gray-500 hover:text-blue-500`

---

## **7. Navigation**
- **Purpose:** Guide users effortlessly between features with minimal friction.
- **Desktop Navigation:**
  - Horizontal nav bars with dropdowns (`flex space-x-4`) for secondary actions.
  - Breadcrumbs for deeper sections (`flex text-gray-600`).
- **Mobile Navigation:** Use collapsible menus (`hidden lg:flex`) with clear toggles.
- Tailwind Examples:
  - Navigation: `flex items-center space-x-6`
  - Mobile Menu: `flex flex-col space-y-2`

---

## **8. Animations and Transitions**
- **Goal:** Subtle, fluid animations that highlight app intelligence without being distracting.
- Use Tailwind’s transition utilities (`transition`, `duration-300`, `ease-in-out`) for hover and active states.
- Add spring effects with **Framer Motion** for natural responsiveness.
- Examples:
  - Hover Effects: `transition ease-in-out duration-200`
  - Page Transitions: Use `motion.div` for slide-ins and fades.

---

## **9. Accessibility**
- Ensure all functionality is accessible to users with varying abilities.
- **Keyboard Navigation:** Focusable elements with clear indicators (`focus:outline-none focus:ring-2`).
- **ARIA Labels:** Clear labeling for screen readers (`aria-label`, `aria-labelledby`).
- **Dynamic Scaling:** Fully support browser zoom and font-size adjustments.

---

## **10. Testing and Optimization**
- **Desktop-First:** Start with desktop layouts, using Tailwind’s responsive utilities (`sm:`, `md:`, `lg:`) to adapt for mobile.
- **Cross-Browser Compatibility:** Test on Chrome, Firefox, Safari, and Edge.
- **Mobile Testing:** Validate usability in both portrait and landscape modes.

---

## **11. Reference Resources**
- **Tailwind Documentation:** [Tailwind CSS Docs](https://tailwindcss.com/docs)
- **Framer Motion:** [Framer Motion Docs](https://www.framer.com/motion/)
- **Heroicons:** [Heroicons Library](https://heroicons.com/)

---

### **Example Developer Description**
> "This web app is designed to provide the best **planning experience** for students by combining functionality, intelligence, and a minimalistic UI that subtly enhances the experience. Prioritize **desktop-first layouts**, scalable **typography**, and **responsive grids**. Colors should reflect a professional, approachable tone with light/dark mode parity. Use Tailwind CSS for styling and Framer Motion for animations. Ensure all features are accessible and perform well across devices."
