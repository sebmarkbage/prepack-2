/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/* @flow */

import type { Realm } from "../realm.js";
import type { LexicalEnvironment } from "../environment.js";
import type { Value } from "../values/index.js";
import type { Reference } from "../environment.js";
import { ObjectValue, StringValue } from "../values/index.js";
import {
  BindingInitialization,
  PutValue,
  GetValue,
  ResolveBinding,
  InitializeReferencedBinding,
  IsAnonymousFunctionDefinition,
  HasOwnProperty,
  SetFunctionName,
} from "../methods/index.js";
import invariant from "../invariant.js";
import type { BabelNodeVariableDeclaration, BabelNodeIdentifier } from "babel-types";

// ECMA262 13.3.1.4
function letAndConst (ast: BabelNodeVariableDeclaration, strictCode: boolean, env: LexicalEnvironment, realm: Realm): Value | Reference {
  for (let declar of ast.declarations) {
    let Initializer = declar.init;

    if (declar.id.type == "Identifier") {
      let id = ((declar.id: any): BabelNodeIdentifier);

      if (!Initializer) {

        // 1. Let lhs be ResolveBinding(StringValue of BindingIdentifier).
        let bindingId = id.name;
        let lhs = ResolveBinding(realm, bindingId, strictCode);

        // 2. Return InitializeReferencedBinding(lhs, undefined).
        InitializeReferencedBinding(realm, lhs, realm.intrinsics.undefined);
        continue;
      }

      // 1. Let bindingId be StringValue of BindingIdentifier.
      let bindingId = id.name;

     // 2. Let lhs be ResolveBinding(bindingId).
     let lhs = ResolveBinding(realm, bindingId, strictCode);

     // 3. Let rhs be the result of evaluating Initializer.
     let rhs = env.evaluate(Initializer, strictCode);

     // 4. Let value be ? GetValue(rhs).
     let value = GetValue(realm, rhs);

     // 5. If IsAnonymousFunctionDefinition(Initializer) is true, then
     if (IsAnonymousFunctionDefinition(realm, Initializer)) {
       invariant(value instanceof ObjectValue);

      // a. Let hasNameProperty be ? HasOwnProperty(value, "name").
      let hasNameProperty = HasOwnProperty(realm, value, "name");

      // b. If hasNameProperty is false, perform SetFunctionName(value, bindingId).
      if (!hasNameProperty) SetFunctionName(realm, value, new StringValue(realm, bindingId));
     }

     // 6. Return InitializeReferencedBinding(lhs, value).
     InitializeReferencedBinding(realm, lhs, value);
   } else { //BindingPattern
     // 1. Let rhs be the result of evaluating Initializer.
     let rhs = Initializer ? env.evaluate(Initializer, strictCode)
              : realm.intrinsics.undefined;

     // 2. Let value be ? GetValue(rhs).
     let value = GetValue(realm, rhs);

     // 3. Let env be the running execution context's LexicalEnvironment.
     let binder_env = realm.getRunningContext().lexicalEnvironment;
     
     // 4. Return the result of performing BindingInitialization for BindingPattern using value and env as the arguments.
     BindingInitialization(realm, declar.id, value, binder_env);
   }
  }
  return realm.intrinsics.empty;
}

// ECMA262 13.3.2.4
export default function (ast: BabelNodeVariableDeclaration, strictCode: boolean, env: LexicalEnvironment, realm: Realm): Value | Reference {
  if (ast.kind === "let" || ast.kind === "const") {
    return letAndConst(ast, strictCode, env, realm);
  }

  for (let declar of ast.declarations) {
    if (declar.id.type !== "Identifier") {
      throw new Error("TODO: Patterns aren't supported yet");
    }

    let Initializer = declar.init;
    if (!Initializer) continue;

    // 1. Let bindingId be StringValue of BindingIdentifier.
    let bindingId = declar.id.name;

    // 2. Let lhs be ? ResolveBinding(bindingId).
    let lhs = ResolveBinding(realm, bindingId, strictCode);

    // 3. Let rhs be the result of evaluating Initializer.
    let rhs = env.evaluate(Initializer, strictCode);

    // 4. Let value be ? GetValue(rhs).
    let value = GetValue(realm, rhs);

    // 5. If IsAnonymousFunctionDefinition(Initializer) is true, then
    if (IsAnonymousFunctionDefinition(realm, Initializer)) {
      invariant(value instanceof ObjectValue);

      // a. Let hasNameProperty be ? HasOwnProperty(value, "name").
      let hasNameProperty = HasOwnProperty(realm, value, "name");

      // b. If hasNameProperty is false, perform SetFunctionName(value, bindingId).
      if (!hasNameProperty) SetFunctionName(realm, value, new StringValue(realm, bindingId));
    }

    // 6. Return ? PutValue(lhs, value).
    PutValue(realm, lhs, value);
  }

  return realm.intrinsics.empty;
}
