/*
  This example requires some changes to your config:
  
  ```
  // tailwind.config.js
  module.exports = {
    // ...
    plugins: [
      // ...
      require('@tailwindcss/forms'),
    ],
  }
  ```
*/
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { Switch } from "@headlessui/react";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ContactSupport() {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-transparent py-12">
      <div className="form-shell max-w-2xl">
        <div className="form-card overflow-hidden">
          <div className="form-header">
            <div className="form-header-icon">C</div>
            <div>
              <h2 className="form-title">Contact Us</h2>
              <p className="form-subtitle">Tell us how we can help and we will respond quickly.</p>
            </div>
          </div>
          <form action="#" method="POST" className="form-section space-y-6">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          <div>
            <label
              htmlFor="first-name"
              className="block text-sm font-semibold leading-6 text-gray-900"
            >
              First name
            </label>
            <div className="mt-2.5">
              <input type="text" name="first-name" id="first-name" autoComplete="given-name" className="w-full" />
            </div>
          </div>
          <div>
            <label
              htmlFor="last-name"
              className="block text-sm font-semibold leading-6 text-gray-900"
            >
              Last name
            </label>
            <div className="mt-2.5">
              <input type="text" name="last-name" id="last-name" autoComplete="family-name" className="w-full" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="company"
              className="block text-sm font-semibold leading-6 text-gray-900"
            >
              Company
            </label>
            <div className="mt-2.5">
              <input type="text" name="company" id="company" autoComplete="organization" className="w-full" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="email"
              className="block text-sm font-semibold leading-6 text-gray-900"
            >
              Email
            </label>
            <div className="mt-2.5">
              <input type="email" name="email" id="email" autoComplete="email" className="w-full" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="phone-number"
              className="block text-sm font-semibold leading-6 text-gray-900"
            >
              Phone number
            </label>
            <div className="relative mt-2.5">
              <div className="absolute inset-y-0 left-0 flex items-center">
                <label htmlFor="country" className="sr-only">
                  Country
                </label>
                <select id="country" name="country" className="h-full rounded-md border-0 bg-transparent bg-none py-0 pl-4 pr-9 text-gray-400">
                  <option>IND</option>
                  <option>UAE</option>
                  <option>US</option>
                </select>
                <ChevronDownIcon
                  className="pointer-events-none absolute right-3 top-0 h-full w-5 text-gray-400"
                  aria-hidden="true"
                />
              </div>
              <input type="tel" name="phone-number" id="phone-number" autoComplete="tel" className="w-full pl-20" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="message"
              className="block text-sm font-semibold leading-6 text-gray-900"
            >
              Message
            </label>
            <div className="mt-2.5">
              <textarea name="message" id="message" rows={4} className="w-full" defaultValue={""} />
            </div>
          </div>
          <Switch.Group as="div" className="flex gap-x-4 sm:col-span-2">
            <div className="flex h-6 items-center">
              <Switch
                checked={agreed}
                onChange={setAgreed}
                className={classNames(
                  agreed ? "bg-slate-900" : "bg-white",
                  "flex w-8 flex-none cursor-pointer rounded-full p-px ring-1 ring-inset ring-gray-900/5 transition-colors duration-200 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                )}
              >
                <span className="sr-only">Agree to policies</span>
                <span
                  aria-hidden="true"
                  className={classNames(
                    agreed ? "translate-x-3.5" : "translate-x-0",
                    "h-4 w-4 transform rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition duration-200 ease-in-out"
                  )}
                />
              </Switch>
            </div>
            <Switch.Label className="text-sm leading-6 text-gray-600">
              By selecting this, you agree to our{" "}
              <a href="#" className="font-semibold text-slate-700">
                privacy&nbsp;policy
              </a>
              .
            </Switch.Label>
          </Switch.Group>
            </div>
            <div className="mt-4">
              <button type="submit" className="btn-primary w-full">
                Let's talk
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
