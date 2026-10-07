import type * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Label, written in normal case; the style uppercases it. */
  children: React.ReactNode;
  /** Trailing Arrow Down (Light) icon for buttons that scroll down the page. */
  icon?: 'arrow-down';
  /** Renders an <a role="button"> instead of a <button>, e.g. "#contact". */
  href?: string;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Uppercase Bai Jamjuree label above the field. Omit to rely on the placeholder, as the site does. */
  label?: React.ReactNode;
  /** Renders a 10rem textarea. */
  multiline?: boolean;
}
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  /** frosted: panel fill + grain + backdrop blur. clear: transparent. Default frosted. */
  variant?: 'frosted' | 'clear';
  /** URL of a background photograph; adds the scrim and grain over it. */
  photo?: string;
  /** Inner padding of gutter-section (default true). */
  padded?: boolean;
  /** Element to render, default "section". */
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}
export declare function Panel(props: PanelProps): React.ReactElement;

export interface SectionHeaderProps {
  /** Kicker, e.g. "Course examples". Wrap words in <mark> to colour them signal. */
  eyebrow?: React.ReactNode;
  /** Title, e.g. "1 Day Trainings". */
  title: React.ReactNode;
  /** section = 2rem heading, tier = 1.75rem heading-sm. Default tier. */
  size?: 'section' | 'tier';
  /** Heading level of the title, default 2. */
  level?: 2 | 3 | 4;
  className?: string;
}
export declare function SectionHeader(props: SectionHeaderProps): React.ReactElement;

export interface CourseItemProps {
  /** Course name in Title Case. */
  name: React.ReactNode;
  /** One to four sentences on what the course covers. */
  children?: React.ReactNode;
  /** Heading level of the name, default 3. */
  level?: 3 | 4 | 5;
  className?: string;
}
export declare function CourseItem(props: CourseItemProps): React.ReactElement;

declare global {
  interface Window { NCRT: { Button: typeof Button; TextField: typeof TextField; Panel: typeof Panel; SectionHeader: typeof SectionHeader; CourseItem: typeof CourseItem } }
}
