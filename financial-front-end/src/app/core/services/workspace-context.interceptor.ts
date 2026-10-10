import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { WorkspaceService } from './workspace.service';

export const workspaceContextInterceptor: HttpInterceptorFn = (req, next) => {
  const workspaceService = inject(WorkspaceService);
  const activeWorkspace = workspaceService.activeWorkspace();

  if (activeWorkspace) {
    const cloned = req.clone({
      setHeaders: {
        'x-workspace-id': activeWorkspace.id,
        'x-workspace-role': activeWorkspace.role
      }
    });
    return next(cloned);
  }

  return next(req);
};
